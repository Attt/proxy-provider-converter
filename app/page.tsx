"use client";
import Image from 'next/image'
import Head from "next/head";
import { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { ArrowsUpDownIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import toast, { Toaster } from "react-hot-toast";

let host = "";
if (typeof window !== "undefined") {
  host = window.location.origin;
}


export default function Home() {
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState("clash");
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [configContent, setConfigContent] = useState("");

  const convertedUrl = `${host}/api/convert?url=${encodeURIComponent(
    url
  )}&target=${target}&include=${!include ? '' : encodeURIComponent(
    include
  )}&exclude=${!exclude ? '' : encodeURIComponent(
    exclude
  )}`;

  let urlHost = "";
  try {
    urlHost = new URL(url).hostname;
  } catch (error) {
    // Ignore
  }

  const copiedToast = () =>
    toast("已复制", {
      position: "bottom-center",
    });

  const clashConfig = `# Clash 配置格式

proxy-groups:
  - name: UseProvider
    type: select
    use:
      - ${urlHost || "provider1"}
    proxies:
      - Proxy
      - DIRECT

proxy-providers:
  ${urlHost || "provider1"}:
    type: http
    url: ${convertedUrl}
    interval: 3600
    path: ./${urlHost || "provider1"}.yaml
    health-check:
      enable: true
      interval: 600
      # lazy: true
      url: http://www.gstatic.com/generate_204
`;

  const surgeConfig = `# Surge 配置格式

[Proxy Group]
${urlHost || "egroup"} = select, policy-path=${convertedUrl}
`;

  async function fetchConfigContent() {
    if(!`${url}`) {
      return;
    }
    const res = await fetch(`${convertedUrl}`)
    setConfigContent(await res.text());
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Head>
        <title>Proxy Provider Converter</title>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </Head>

      <div className="flex flex-col items-start flex-1 max-w-4xl px-4 py-8 md:py-12">
        <div className="flex flex-col items-start md:items-center md:flex-row">
          <Image src="/logo.svg" alt="Logo" className="md:mr-4 h-28" width={100} height={100} />
          <div>
            <h1 className="text-2xl font-extrabold text-black md:text-5xl">
              Proxy Provider Converter
            </h1>
            <p className="mt-2 md:text-lg text-gray-600">
              一个可以将 Clash 订阅转换成 Proxy Provider 和 External
              Group(Surge) 的工具
            </p>
          </div>
        </div>
        <div className="w-full text-gray-900 mt-14">
          <h3 className="text-lg md:text-xl font-bold">开始使用</h3>
          <div className="flex w-full gap-4 mt-4 flex-col md:flex-row">
            <input
              className="w-full h-full p-4 text-lg bg-white rounded-lg shadow-sm focus:outline-none"
              placeholder="粘贴 Clash 订阅链接到这里"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="relative">
              <select
                className="w-full md:w-max py-3 pl-4 pr-10 text-lg bg-white rounded-lg shadow-sm appearance-none focus:outline-none"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="clash">转换到 Clash</option>
                <option value="surge">转换到 Surge</option>
              </select>
              <ArrowsUpDownIcon className="absolute h-6 top-3.5 right-3 text-gray-400" />
            </div>
          </div>
          <div className="flex w-full flex-col gap-4 md:flex-row" style={{ rowGap: 0 }}>
            <div className="flex w-full gap-4 mt-4 flex-col md:flex-row">
              <input
                className="w-full h-full p-4 text-lg bg-white rounded-lg shadow-sm focus:outline-none"
                placeholder="包含节点正则表达式"
                value={include}
                onChange={(e) => setInclude(e.target.value)}
              />
            </div>
            <div className="flex w-full gap-4 mt-4 flex-col md:flex-row">
              <input
                className="w-full h-full p-4 text-lg bg-white rounded-lg shadow-sm focus:outline-none"
                placeholder="排除节点正则表达式"
                value={exclude}
                onChange={(e) => setExclude(e.target.value)}
              />
            </div>
            <div className="relative">
              <button
                className="w-full md:w-max py-3 mt-4 pl-4 pr-10 text-lg bg-white rounded-lg shadow-sm focus:outline-none"
                onClick={fetchConfigContent}
              >
                节点预览
              </button>
            </div>
          </div>
        </div>
        {url && (
          <div className="break-all p-3 mt-4 rounded-lg text-gray-100 bg-gray-900 shadow-sm w-full">
            {convertedUrl}

            <CopyToClipboard text={convertedUrl} onCopy={() => copiedToast()}>
              <div className="flex items-center text-sm mt-4 text-gray-400  cursor-pointer  hover:text-gray-300 transition duration-200 select-none">
                <DocumentDuplicateIcon className="h-5 w-5 mr-1 inline-block" />
                点击复制
              </div>
            </CopyToClipboard>
          </div>
        )}
        {url && (
          <div className="w-full p-4 mt-4 text-gray-100 bg-gray-900 rounded-lg hidden md:block">
            {/* prettier-ignore */}
            {target !== "surge" && (
              <pre className="whitespace-pre-wrap">
                {clashConfig}
                </pre>
            )}

            {target === "surge" && <pre>{surgeConfig}</pre>}
            {/* prettier-ignore */}

            <CopyToClipboard
              text={target === "surge" ? surgeConfig : clashConfig}
              onCopy={() => copiedToast()}
            >
              <div className="flex items-center text-sm mt-4 text-gray-400 cursor-pointer hover:text-gray-300 transition duration-200 select-none">
                <DocumentDuplicateIcon className="h-5 w-5 mr-1 inline-block" />
                点击复制
              </div>
            </CopyToClipboard>
          </div>
        )}
        {url && configContent && (
          <div className="w-full p-4 mt-4 text-gray-100 bg-gray-900 rounded-lg shadow-sm">
            <pre style={{ wordBreak: "break-all" }} className="whitespace-pre-wrap">
              <code>
              # 预览配置来源: {convertedUrl}<br></br>
              </code>
              <code>
                {configContent}
                </code>
              </pre>

            <CopyToClipboard text={configContent} onCopy={() => copiedToast()}>
              <div className="flex items-center text-sm mt-4 text-gray-400  cursor-pointer  hover:text-gray-300 transition duration-200 select-none">
                <DocumentDuplicateIcon className="h-5 w-5 mr-1 inline-block" />
                点击复制
              </div>
            </CopyToClipboard>
          </div>
        )}
        <div className="mt-12 text-gray-900">
          <h3 className="text-lg md:text-xl font-bold">
            什么是 Proxy Provider 和 External Group？
          </h3>
          <p className="mt-2">
            <a
              href="https://github.com/Dreamacro/clash/wiki/configuration#proxy-providers"
              className="text-yellow-600 transition hover:text-yellow-500"
            >
              Proxy Provider
            </a>{" "}
            是 Clash
            的一项功能，可以让用户从指定路径动态加载代理服务器列表。使用这个功能你可以将
            Clash
            订阅里面的代理服务器提取出来，放到你喜欢的配置文件里，也可以将多个
            Clash 订阅里的代理服务器混合到一个配置文件里。External Group 则是
            Proxy Provider 在 Surge 里的叫法，作用是一样的。
          </p>
        </div>
        <div className="mt-12 text-gray-900">
          <h3 className="text-lg md:text-xl font-bold">
            简单的正则示例
          </h3>
          <p className="mt-2">
            包含&quot;hk&quot;或者&quot;hong kong&quot;: <pre><code className='font-bold'>hk|hong kong</code></pre><br></br>
            匹配&quot;hong kong 0.2x&quot;或者&quot;japan 0.1x&quot;: <pre><code className='font-bold'>(hong kong|japan).*0\.</code></pre>
          </p>
        </div>
        <div className="w-full text-gray-900 mt-14">
          <h3 className="text-lg md:text-xl font-bold">
            怎么自己部署转换工具？
          </h3>
          <p className="mt-2">
            使用工具时， {host}
            的拥有者将会有权限查看到你的订阅地址，如果你不想让给他人这种权限，
            你可以fork下面仓库零成本部署一个属于你的转换工具。
          </p>
          <ul>
            <li>
              <p className="mt-2">
                如果使用原版工具并且部署在{" "}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  className="text-yellow-600 transition hover:text-yellow-500"
                >
                  Vercel.com
                </a>
                ，请转到{" "}
                <a
                  href="https://github.com/qier222/proxy-provider-converter"
                  target="_blank"
                  className="text-yellow-600 transition hover:text-yellow-500"
                >
                  https://github.com/qier222/proxy-provider-converter
                </a>
              </p>
            </li>
            <li>
              <p className="mt-2">
                如果使用当前页面上的版本并且部署在{" "}
                <a
                  href="https://pages.cloudflare.com/"
                  target="_blank"
                  className="text-yellow-600 transition hover:text-yellow-500"
                >
                  Cloudflare Pages
                </a>
                ，请转到{" "}：
                <a
                  href="https://github.com/Attt/proxy-provider-converter"
                  target="_blank"
                  className="text-yellow-600 transition hover:text-yellow-500"
                >
                  https://github.com/Attt/proxy-provider-converter
                </a>{" "}的{" "}
                <a
                  href="https://github.com/Attt/proxy-provider-converter/tree/cf-pages"
                  target="_blank"
                  className="text-yellow-600 transition hover:text-yellow-500"
                >
                  cf-pages
                </a>{" "}
                分支
              </p>
            </li>
          </ul>
        </div>
        <div className="w-full text-gray-900 mt-14">
          <h3 className="text-lg md:text-xl font-bold">资源</h3>
          <ul className="mt-1 list-disc list-inside	">
            <li>
              <a
                href="https://github.com/Dreamacro/clash/wiki/configuration#proxy-providers"
                target="_blank"
                className="text-yellow-600 transition hover:text-yellow-500"
              >
                Clash Wiki 中的 Proxy Providers 章节
              </a>
            </li>
            <li>
              <a
                href="https://manual.nssurge.com/policy/group.html"
                target="_blank"
                className="text-yellow-600 transition hover:text-yellow-500"
              >
                Surge Policy Group 文档
              </a>
            </li>
          </ul>
        </div>
      </div>

      <footer className="w-full p-4 max-w-4xl md:py-8">
        <a
          className="flex items-center"
          href="https://vercel.com/frameworks/nextjs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by
          <Image src="/next.svg" alt="Next Logo" className="h-4 ml-2" width={394} height={80} />
        </a>
      </footer>

      <Toaster />
    </main>
  );
}
