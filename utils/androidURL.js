import axios from "axios";
import { getStringMD5 } from "./EncryUtils.js";
import { getddCalcuURL, getddCalcuURL720p, getEncryptURL } from "./ddCalcuURL.js";
import { changedDdCalcu } from "./datas.js";
import { printYellow } from "./colorOut.js";

function getSaltAndSign(md5) {

  const salt = 1230024
  const suffix = "3ce941cc3cbc40528bfd1c64f9fdf6c0migu0123"
  const sign = getStringMD5(md5 + suffix)
  return {
    salt: salt,
    sign: sign
  }
}

function replaceChars(url, pid, rateType) {

  // 参数为空或者不符条件
  if (!url || rateType <= 1 || rateType >= 5 || !pid) {
    return ""
  }
  const spl = url.split("&ddCalcu=")
  const prefix = spl[0]
  let suffix = spl[1]

  suffix = suffix.replace("sv=10000&ct=www", "sv=10004&ct=android")
  // 默认替换方式
  let defaultChange = ["x", "a", "y", "a"]
  let index = [5, 8, 11, 14]
  // 一些标清不需要改
  let noChangeStandard = false

  // 替换自定义替换方式
  if (changedDdCalcu[pid] != undefined) {
    noChangeStandard = changedDdCalcu[pid].noChangeStandard
    if (changedDdCalcu[pid]["all"] != undefined) {
      defaultChange = changedDdCalcu[pid]["all"].data
      index = changedDdCalcu[pid]["all"].index
    }
    if (changedDdCalcu[pid][rateType]) {
      // 若相邻两个重复可以写另一个的rateType
      if (!isNaN(changedDdCalcu[pid][rateType])) {
        const rate = changedDdCalcu[pid][rateType]
        defaultChange = changedDdCalcu[pid][rate].data
        index = changedDdCalcu[pid][rate].index
      } else {
        defaultChange = changedDdCalcu[pid][rateType].data
        index = changedDdCalcu[pid][rateType].index
      }
    }
  }

  // 一些标清需要改
  if (rateType == 2 && !noChangeStandard) {
    defaultChange[0] = "v"
  }

  // 替换
  for (let i = 0; i < index.length; i++) {
    suffix[index[i] - 1] = defaultChange[i]
  }

  return `${prefix}&ddCalcu=${suffix}`
}

async function getAndroidVideoURL(userId, token, exports, pid, rateType) {
  if (rateType <= 1) {
    return {
      url: "",
      rateType: 0
    }
  }
  if (!exports) {
    return {
      url: "",
      rateType: 0
    }
  }
  // 获取url
  const timestramp = Date.now()
  const appVersion = "26000370"
  let headers = {
    AppVersion: 2600037000,
    TerminalId: "android",
    "X-UP-CLIENT-CHANNEL-ID": "2600037000-99000-200300220100002"
  }
  if (rateType != 2) {
    headers.UserId = userId
    headers.UserToken = token
  }
  // console.log(headers)
  const str = timestramp + pid + appVersion
  const md5 = getStringMD5(str)
  const result = getSaltAndSign(md5)

  // 请求
  const baseURL = "https://play.miguvideo.com/playurl/v1/play/playurl"
  const params = "?sign=" + result.sign + "&rateType=" + rateType
    + "&contId=" + pid + "&timestamp=" + timestramp + "&salt=" + result.salt
  const respData = await axios.get(baseURL + params, {
    headers: headers
  }).then(r => r.data)

  // console.log(respData)
  const url = respData.body.urlInfo?.url
  // console.log(rateType)
  // console.log(url)
  if (!url) {
    return {
      url: "",
      rateType: 0
    }
  }
  rateType = parseInt(respData.body.urlInfo?.rateType)

  // 将URL加密
  const encryURL = getEncryptURL(exports, url)
  // console.log("加密后:" + encryURL)
  // 替换字符，拼接结果
  const resURL = replaceChars(encryURL, pid, rateType)
  // console.log("app替换后的链接：" + resURL)
  // console.log("播放画质：" + rateType)
  return {
    url: resURL,
    rateType: rateType
  }

}


/**
 * @param {string} userId - 用户ID
 * @param {string} token - 用户token
 * @param {string} pid - 节目ID
 * @param {number} rateType - 清晰度
 * @returns {} - url: 链接 rateType: 清晰度
 */
async function getAndroidURL(userId, token, pid, rateType) {

  if (rateType <= 1) {
    return {
      url: "",
      rateType: 0
    }
  }
  // 获取url
  const timestramp = Date.now()
  const appVersion = "26000370"
  let headers = {
    AppVersion: 2600037000,
    TerminalId: "android",
    "X-UP-CLIENT-CHANNEL-ID": "2600037000-99000-200300220100002",
    "host": process.env.APP_PLAY_HOST
  }

  // 广东卫视有些特殊
  if (pid == "608831231") {
    rateType = 2
  }

  if (rateType != 2 && userId != "" && token != "") {
    headers.UserId = userId
    headers.UserToken = token
  }
  // console.log(headers)
  const str = timestramp + pid + appVersion
  const md5 = getStringMD5(str)
  const result = getSaltAndSign(md5)

  // 请求
  const baseURL = "https://play.miguvideo.com/playurl/v1/play/playurl"
  let params = "?sign=" + result.sign + "&rateType=" + rateType
    + "&contId=" + pid + "&timestamp=" + timestramp + "&salt=" + result.salt
  let respData = await axios.get(baseURL + params, {
    headers: headers
  }).then(r => r.data)

  if (respData.rid == 'TIPS_NEED_MEMBER') {
    printYellow("该账号没有会员 正在降低画质")

    params = "?sign=" + result.sign + "&rateType=" + (rateType - 1)
      + "&contId=" + pid + "&timestamp=" + timestramp + "&salt=" + result.salt
    respData = await axios.get(baseURL + params, {
      headers: headers
    }).then(r => r.data)
  }

  // console.dir(respData, { depth: null })
  // console.log(respData)
  const url = respData.body.urlInfo?.url
  // console.log(rateType)
  // console.log(url)
  if (!url) {
    return {
      url: "",
      rateType: 0
    }
  }

  // 将URL加密
  const resURL = getddCalcuURL(url, pid, "android", rateType)

  rateType = respData.body.urlInfo?.rateType
  // console.log("清晰度" + rateType)

  return {
    url: resURL,
    rateType: parseInt(rateType)
  }

}


/**
 * 旧版高清画质
 * @param {string} pid - 节目ID
 * @returns {} - url: 链接 rateType: 清晰度
 */
async function getAndroidURL720p(pid) {
  // 获取url
  const timestramp = Date.now()
  const appVersion = "26000009"
  let headers = {
    AppVersion: 2600000900,
    TerminalId: "android",
    "X-UP-CLIENT-CHANNEL-ID": "2600000900-99000-201600010010027",
    "host": process.env.APP_PLAY_HOST
  }
  // console.log(headers)
  const str = timestramp + pid + appVersion
  const md5 = getStringMD5(str)

  const salt = 66666601
  const suffix = "770fafdf5ba04d279a59ef1600baae98migu6666"
  const sign = getStringMD5(md5 + suffix)

  let rateType = 3
  // 广东卫视有些特殊
  if (pid == "608831231") {
    rateType = 2
  }
  // 请求
  const baseURL = process.env.APP_PLAY_URL || "https://play.miguvideo.com/playurl/v1/play/playurl"
  const params = "?sign=" + sign + "&rateType=" + rateType
    + "&contId=" + pid + "&timestamp=" + timestramp + "&salt=" + salt
  const respData = await axios.get(baseURL + params, {
    headers: headers
  }).then(r => r.data)

  // console.log(respData)
  const url = respData.body.urlInfo?.url
  // console.log(rateType)
  // console.log(url)
  if (!url) {
    return {
      url: "",
      rateType: 0
    }
  }

  rateType = respData.body.urlInfo?.rateType

  // 将URL加密
  const resURL = getddCalcuURL720p(url, pid)

  return {
    url: resURL,
    rateType: parseInt(rateType)
  }

}

export { getAndroidVideoURL, getAndroidURL, getAndroidURL720p }
