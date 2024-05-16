import { type NextRequest, NextResponse } from 'next/server'
import axios, { AxiosError, AxiosAdapter } from 'axios';
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

export async function GET(request: NextRequest,
  { params }: { params: { url: string, target: string } }
) {

    // 使用模板字符串输出日志信息
    console.log(`query: ${JSON.stringify(request)}`);

    // 使用可选链操作符检查url是否存在
    if (!params.url) {
        return new Response('Missing parameter: url', {
            status: 400
          });
    }

    console.log(`Fetching url: ${params.url}`);
    let configFile: string | null = null;
    try {

        const result = await axios.get(params.url, {
            headers: {
                "User-Agent": "ClashX Pro/1.72.0.4 (com.west2online.ClashXPro; build:1.72.0.4; macOS 12.0.1) Alamofire/5.4.4",
            },
            adapter: axios.defaults.adapter as AxiosAdapter
        });
        configFile = result.data;
    } catch (error: unknown) {
        // 使用AxiosError类型来捕获错误 TODO fix : Unable to get url, error: adapter is not a function
        const axiosError = error as AxiosError;
        return new Response(`Unable to get url, error: ${axiosError.message}`, {
            status: 400
          });
    }

    console.log(`Parsing YAML`);
    let configData: any; // 这里需要定义具体的类型，根据实际解析的YAML内容
    try {
        configData = YAML.load(configFile!);
        console.log(`👌 Parsed YAML`);
    } catch (error) {
        return new Response(`Unable parse config, error: ${error}`, {
            status: 500
          });
    }

    if (configData.proxies === undefined) {
        return new Response("No proxies in this config", {
            status: 400
          });
    }


    if (params.target === 'surge') {
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
        return new Response(proxies.join("\n"), {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
    } else {
        const response = YAML.dump({ proxies: configData.proxies });
        return new Response(response, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
    }
}