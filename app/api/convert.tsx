import { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosError } from 'axios';
import * as YAML from 'js-yaml';

export const runtime = 'edge';

interface Proxy {
    name: string;
    type: string;
    server: string;
    port: number;
    cipher?: string;
    password?: string;
    plugin?: string;
    "plugin-opts"?: {
        mode?: string;
        host?: string;
    };
    udp?: boolean;
    uuid?: string;
    "skip-cert-verify"?: boolean;
    servername?: string;
    tls?: boolean;
    network?: string;
    "ws-path"?: string;
    sni?: string;
}

// 使用Next.js的API路由处理函数
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { rawRrl, target } = req.query;
    // 确保url是字符串类型
    const url = Array.isArray(rawRrl) ? rawRrl[0] : rawRrl;

    // 使用模板字符串输出日志信息
    console.log(`query: ${JSON.stringify(req.query)}`);

    // 使用可选链操作符检查url是否存在
    if (!url) {
        return res.status(400).send("Missing parameter: url");
    }

    console.log(`Fetching url: ${url}`);
    let configFile: string | null = null;
    try {

        const result = await axios.get(url, {
            headers: {
                "User-Agent": "ClashX Pro/1.72.0.4 (com.west2online.ClashXPro; build:1.72.0.4; macOS 12.0.1) Alamofire/5.4.4",
            },
        });
        configFile = result.data;
    } catch (error: unknown) {
        // 使用AxiosError类型来捕获错误
        const axiosError = error as AxiosError;
        return res.status(400).send(`Unable to get url, error: ${axiosError.message}`);
    }

    console.log(`Parsing YAML`);
    let configData: any; // 这里需要定义具体的类型，根据实际解析的YAML内容
    try {
        configData = YAML.load(configFile!);
        console.log(`👌 Parsed YAML`);
    } catch (error) {
        return res.status(500).send(`Unable parse config, error: ${error}`);
    }

    if (configData.proxies === undefined) {
        res.status(400).send("No proxies in this config");
        return;
    }


    if (target === 'surge') {
        const supportedProxies = configData.proxies.filter((proxy: { type: string; }) =>
            ["ss", "vmess", "trojan"].includes(proxy.type)
        );
        const surgeProxies = supportedProxies.map((proxy: Proxy) => {
            console.log(proxy.server);
            const common = `${proxy.name} = ${proxy.type}, ${proxy.server}, ${proxy.port}`;
            if (proxy.type === "ss") {
                // ProxySS = ss, example.com, 2021, encrypt-method=xchacha20-ietf-poly1305, password=12345, obfs=http, obfs-host=example.com, udp-relay=true
                if (proxy.plugin === "v2ray-plugin") {
                    console.log(
                        `Skip convert proxy ${proxy.name} because Surge does not support Shadowsocks with v2ray-plugin`
                    );
                    return;
                }
                let result = `${common}, encrypt-method=${proxy.cipher}, password=${proxy.password}`;
                if (proxy.plugin === "obfs") {
                    if (proxy?.["plugin-opts"] && proxy?.["plugin-opts"]) {
                        const mode = proxy?.["plugin-opts"].mode;
                        const host = proxy?.["plugin-opts"].host;
                        result = `${result}, obfs=${mode}${host ? `, obfs-host=example.com ${host}` : ""
                            }`;
                    }
                }
                if (proxy.udp) {
                    result = `${result}, udp-relay=${proxy.udp}`;
                }
                return result;
            } else if (proxy.type === "vmess") {
                // ProxyVmess = vmess, example.com, 2021, username=0233d11c-15a4-47d3-ade3-48ffca0ce119, skip-cert-verify=true, sni=example.com, tls=true, ws=true, ws-path=/path
                if (proxy.network && ["h2", "http", "grpc"].includes(proxy.network)) {
                    console.log(
                        `Skip convert proxy ${proxy.name} because Surge probably doesn't support Vmess(${proxy.network})`
                    );
                    return;
                }
                let result = `${common}, username=${proxy.uuid}`;
                if (proxy["skip-cert-verify"]) {
                    result = `${result}, skip-cert-verify=${proxy["skip-cert-verify"]}`;
                }
                if (proxy.servername) {
                    result = `${result}, sni=${proxy.servername}`;
                }
                if (proxy.tls) {
                    result = `${result}, tls=${proxy.tls}`;
                }
                if (proxy.network === "ws") {
                    result = `${result}, ws=true`;
                }
                if (proxy["ws-path"]) {
                    result = `${result}, ws-path=${proxy["ws-path"]}`;
                }
                return result;
            } else if (proxy.type === "trojan") {
                // ProxyTrojan = trojan, example.com, 2021, username=user, password=12345, skip-cert-verify=true, sni=example.com
                if (proxy.network && ["grpc"].includes(proxy.network)) {
                    console.log(
                        `Skip convert proxy ${proxy.name} because Surge probably doesn't support Trojan(${proxy.network})`
                    );
                    return;
                }
                let result = `${common}, password=${proxy.password}`;
                if (proxy["skip-cert-verify"]) {
                    result = `${result}, skip-cert-verify=${proxy["skip-cert-verify"]}`;
                }
                if (proxy.sni) {
                    result = `${result}, sni=${proxy.sni}`;
                }
                return result;
            }
        });
        const proxies = surgeProxies.filter((p: { type: string }) => p !== undefined);
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(proxies.join("\n"));
    } else {
        const response = YAML.dump({ proxies: configData.proxies });
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(response);
    }
}