import { type NextRequest } from 'next/server'
import axios, { AxiosError, AxiosRequestHeaders } from 'axios';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import YAML from 'yaml';
import { Buffer } from "buffer";

export const runtime = 'edge';

export async function GET(request: NextRequest,
    { params }: { params: { url: string, proxy_group: string, rule: string } }
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

        const service = axios.create({ adapter: fetchAdapter })
        const genHeaders: AxiosRequestHeaders = {
            'user-agent': "ClashX Pro/1.72.0.4 (com.west2online.ClashXPro; build:1.72.0.4; macOS 12.0.1) Alamofire/5.4.4"
        }
        // FIXME 这里的header不起作用
        const result = await service.get(params.url, {
            headers: genHeaders
        });
        configFile = result.data;

    } catch (error: unknown) {
        // 使用AxiosError类型来捕获错误
        const axiosError = error as AxiosError;
        return new Response(`Unable to get url, error: ${axiosError.message}`, {
            status: 400
        });
    }

    console.log(`Parsing YAML`);
    let configData: any; // 这里需要定义具体的类型，根据实际解析的YAML内容
    try {
        configData = YAML.parse(configFile!);
        if (configData.proxies === undefined) {
            try {
                configData = Buffer.from(configData, 'base64').toString('binary');
            } catch (error) {
            }
        }
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

    // push proxy groups to configData
    /*
        name: "load-balance"
        type: load-balance
        proxies:
            - ss1
            - ss2
            - vmess1
        url: 'https://www.gstatic.com/generate_204'
        interval: 300
        #lazy: true
        #strategy: consistent-hashing # or round-robin
    */

    if (params?.proxy_group && configData['proxy-groups']){
        const proxy_group_json = JSON.parse(params?.proxy_group)

        configData['proxy-groups'].push({
            'name': proxy_group_json.name,
            'type': proxy_group_json.type,
            'proxies': proxy_group_json.proxies,
            'interval': proxy_group_json.interval,
            'url': proxy_group_json.url,
            'strategy': proxy_group_json.strategy
        })
    }

    if (params?.rule && configData['rules']) {
        configData['rules'].unshift(params?.rule)
    }

    const response = YAML.stringify({ configData });
        return new Response(response, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
}