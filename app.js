import http from "node:http"
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { getAndroidURL, getAndroidURL720p } from "./utils/androidURL.js";
import { readFileSync } from "./utils/fileUtil.js";
import { host, port, rateType, token, userId, ipWhiteFile } from "./config.js";
import { getDateTimeStr } from "./utils/time.js";
import update from "./updateData.js";
import { printBlue, printGreen, printGrey, printMagenta, printRed, printYellow } from "./utils/colorOut.js";
import { delay } from "./utils/fetchList.js";
import ipRangeCheck from "ip-range-check";

// 运行时长
var hours = 0
// url缓存 降低请求频率
const urlCache = {}

let loading = false

let ipWhiteList = [];
function loadIpWhite(){
  try {
    const data = fs.readFileSync(ipWhiteFile, 'utf-8');
    ipWhiteList = data.split(/\r?\n/).filter(line => line.trim() !== '');
    printBlue("IP白名单已更新")
    console.log(ipWhiteList)
  } catch (error) {
    printRed("IP白名单更新失败")
    console.log(error)
  }
}

loadIpWhite();
fs.watchFile(ipWhiteFile, async (curr, prev) => {
  loadIpWhite();
});


const server = http.createServer(async (req, res) => {

  // while (loading) {
  //   await delay(50)
  // }
  const clientIp = req.headers['x-real-ip'] || req.socket.remoteAddress;
  console.log(`客户端IP: ${clientIp}`);
  // 检查IP是否在白名单中
  if (ipWhiteList.length > 0 && !ipRangeCheck(clientIp, ipWhiteList)) {
    res.writeHead(403, {'Content-Type': 'application/json;charset=UTF-8'});
    res.end(JSON.stringify({
      data: '访问被拒绝：403。',
    }));
    printRed(`拒绝访问，IP不在白名单中: ${clientIp}`);
    return;
  }

  loading = true

  // 获取请求方法、URL 和请求头
  const { method, url, headers } = req;

  // printGreen("")
  printMagenta("请求地址：" + url)

  if (method != "GET") {
    res.writeHead(200, { 'Content-Type': 'application/json;charset=UTF-8' });
    res.end(JSON.stringify({
      data: '请使用GET请求',
    }));
    printRed(`使用非GET请求:${method}`)

    loading = false
    return
  }

  const urlParsed = new URL('http://localhost' + url);
  // 响应接口内容
  if (urlParsed.pathname === "/" || urlParsed.pathname === "/interface.txt") {
    try {
      // 读取文件内容
      let data = await fsPromises.readFile(process.cwd() + "/interface.txt");

      // 设置响应头
      res.setHeader('Content-Type', 'text/plain;charset=UTF-8');
      res.statusCode = 200;
      const queryProtocol = (urlParsed.searchParams.get('protocol')) === 'https' ? 'https' : 'http';
      data = String(data).replaceAll(host, queryProtocol + '://' + req.headers.host);

      res.end(data); // 发送文件内容

      loading = false
      return
    } catch (error) {

      res.writeHead(200, { "Content-Type": "application/json;charset=UTF-8" })
      res.end("访问异常")
      printRed("接口文件响应异常", error)

      loading = false
      return
    }
  }

  // 回放
  if (url == "/playback.xml") {

    try {
      // 读取文件内容
      const data = readFileSync(process.cwd() + "/playback.xml");

      // 设置响应头
      res.setHeader('Content-Type', 'text/xml;charset=UTF-8');
      res.statusCode = 200;
      res.end(data); // 发送文件内容
      loading = false
      return
    } catch (error) {

      res.writeHead(200, { "Content-Type": "application/json;charset=UTF-8" })
      res.end("访问异常")
      printRed("回放文件响应异常", error)
      loading = false
      return
    }

  }

  let urlSplit = url.split("/")[1]
  let pid = urlSplit
  let params = ""

  if (urlSplit.match(/\?/)) {
    // 回放
    printGreen("处理传入参数")

    const urlSplit1 = urlSplit.split("?")
    pid = urlSplit1[0]
    params = urlSplit1[1]
  } else {
    printGrey("无参数传入")
  }

  if (isNaN(pid)) {
    res.writeHead(200, { "Content-Type": "application/json;charset=UTF-8" })
    res.end("地址错误")
    printRed("地址格式错误")
    loading = false
    return
  }

  printYellow("频道ID " + pid)

  // 是否存在缓存
  if (typeof urlCache[pid] === "object") {
    const valTime = urlCache[pid].valTime - Date.now()
    // 缓存是否有效
    if (valTime >= 0) {

      printGreen(`缓存有效，使用缓存数据`)

      let playURL = urlCache[pid].url
      // 节目调整
      if (playURL == "") {
        let msg = "节目调整，暂不提供服务"
        if (urlCache[pid].content != null) {
          msg = urlCache[pid].content.message
        }
        printRed(`${pid} ${msg}`)

        res.writeHead(200, { "Content-Type": "application/json;charset=UTF-8" })
        res.end(msg)
        loading = false
        return
      }

      // 添加回放参数
      if (params != "") {
        const resultParams = new URLSearchParams(params);
        for (const [key, value] of resultParams) {
          playURL = `${playURL}&${key}=${value}`
        }
      }
      res.writeHead(302, {
        'Content-Type': 'application/json;charset=UTF-8',
        location: playURL
      });

      res.end()
      loading = false
      return
    }
  }

  let resObj = {}
  try {
    // 未登录请求720p
    if (rateType >= 3 && (userId == "" || token == "")) {
      resObj = await getAndroidURL720p(pid)
    } else {
      resObj = await getAndroidURL(userId, token, pid, rateType)
    }
  } catch (error) {
    res.writeHead(200, { "Content-Type": "application/json;charset=UTF-8" })
    res.end("链接请求出错，请稍后重试")
    printRed("链接请求出错", error)
    loading = false
    return
  }

  // 直接访问g开头的域名链接时概率会302到不能播放的地址,目前不清楚原因,在这重定向正确地址
  // printRed(resObj.url)
  let changeFailed = false
  if (resObj.url != "") {
    let z = 1
    while (z <= 6) {
      if (z >= 2) {
        printYellow(`获取失败,正在第${z - 1}次重试`)
      }
      const obj = await fetch(`${resObj.url}`, {
        method: "GET",
        redirect: "manual"
      })

      const location = obj.headers.get("Location")

      if (location == "" || location == undefined || location == null) {
        continue
      }
      if (location.startsWith("http://hlsz") || location.startsWith("http://mgsp") || location.startsWith("http://trial")) {
        resObj.url = location
        break
      }
      if (z == 6) {
        printYellow(`获取失败,返回原链接`)
        changeFailed = true
      } else {
        await delay(150)
      }
      z++
    }
  }

  // printRed(resObj.url)
  printGreen(`添加节目缓存 ${pid}`)
  // 缓存有效时长
  let addTime = 3 * 60 * 60 * 1000
  // 节目调整时改为1分钟
  if (resObj.url == "") {
    addTime = 1 * 60 * 1000
  }
  // 尝试失败后原地址改为1小时
  if (changeFailed) {
    addTime = 1 * 60 * 60 * 1000
  }
  // 加入缓存
  urlCache[pid] = {
    // 有效期3小时 节目调整时改为1分钟
    valTime: Date.now() + addTime,
    url: resObj.url,
    content: resObj.content,
  }
  // console.log(resObj.url)

  if (resObj.url == "") {
    let msg = "节目调整，暂不提供服务"
    if (resObj.content != null) {
      msg = resObj.content.message
    }
    printRed(`${pid} ${msg}`)

    res.writeHead(200, { "Content-Type": "application/json;charset=UTF-8" })
    res.end(msg)
    loading = false
    return
  }
  let playURL = resObj.url

  // console.dir(playURL, { depth: null })

  // 添加回放参数
  if (params != "") {
    const resultParams = new URLSearchParams(params);
    for (const [key, value] of resultParams) {
      playURL = `${playURL}&${key}=${value}`
    }
  }

  printGreen("链接获取成功")

  res.writeHead(302, {
    'Content-Type': 'application/json;charset=UTF-8',
    location: playURL
  });

  res.end()

  loading = false
})

server.listen(port, async () => {

  // 设置定时器，3小时更新一次
  setInterval(async () => {
    printBlue(`准备更新文件 ${getDateTimeStr(new Date())}`)
    hours += 3
    try {
      await update(hours)
    } catch (error) {
      printRed(error)
      printRed("更新失败")
      console.log(error)
    }

    printBlue(`当前已运行${hours}小时`)
  }, 3 * 60 * 60 * 1000);

  try {
    // 初始化数据
    //await update(hours)
  } catch (error) {
    printRed(error)
    printRed("更新失败")
    console.log(error)
  }

  printGreen("每3小时更新一次")

  printGreen(`本地地址: http://localhost:${port}`)
  if (host != "") {
    printGreen(`自定义地址: ${host}`)
  }
})

