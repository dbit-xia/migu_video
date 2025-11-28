import { dataList } from "./utils/fetchList.js"
import { appendFile, appendFileSync, renameFileSync, writeFile } from "./utils/fileUtil.js"
import { updatePlaybackData } from "./utils/playback.js"
import { host, token, userId } from "./config.js"
import refreshToken from "./utils/refreshToken.js"
import { printBlue, printGreen, printMagenta, printRed, printYellow } from "./utils/colorOut.js"

async function update(hours) {

  const date = new Date()
  const start = date.getTime()
  let interfacePath = ""
  // 获取数据
  const datas = await dataList()

  if (!(hours % 24)) {
    // 必须绝对路径
    interfacePath = process.cwd() + '/interface.txt.bak'
    // 创建写入空内容
    writeFile(interfacePath, "")
  }

  if (!(hours % 24)) {
    // 每24小时刷新token
    if (!(userId == "" || token == "")) {
      await refreshToken(userId, token) ? printGreen("token刷新成功") : printRed("token刷新失败")
    }
    appendFile(interfacePath, `#EXTM3U x-tvg-url="${host}/playback.xml" catchup="append" catchup-source="?playbackbegin=\${(b)yyyyMMddHHmmss}&playbackend=\${(e)yyyyMMddHHmmss}"\n`)
  }
  printYellow("正在更新...")
  // 回放
  const playbackFile = process.cwd() + '/playback.xml.bak'
  writeFile(playbackFile,
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<tv generator-info-name="Tak" generator-info-url="${host}">\n`)

  // 分类列表
  for (let i = 0; i < datas.length; i++) {
    if (!(hours % 24)) {
      printBlue(`分类###:${datas[i].name}`)
    }
    const data = datas[i].dataList
    // 写入节目
    for (let j = 0; j < data.length; j++) {
      printMagenta(`${data[j].name}：`)
      // const res = await updatePlaybackData(data[j], playbackFile)
      // if (res) {
      //   printGreen(`    节目单更新成功`)
      // } else {
      //   printRed(`    节目单更新失败`)
      // }

      if (!(hours % 24)) {
        // 写入节目
        appendFile(interfacePath, `#EXTINF:-1 svg-id="${data[j].name}" svg-name="${data[j].name}" tvg-logo="${data[j].pics.highResolutionH}" group-title="${datas[i].name}",${data[j].name}\n${host}/${data[j].pID}\n`)
        printGreen(`    节目链接更新成功`)
      }
    }
  }

  appendFileSync(playbackFile, `</tv>\n`)

  // 重命名
  renameFileSync(playbackFile, playbackFile.replace(".bak", ""))
  if (!(hours % 24)) {
    renameFileSync(interfacePath, interfacePath.replace(".bak", ""))
  }
  printYellow("更新完成")
  const end = Date.now()
  printYellow(`本次耗时:${(end - start) / 1000}秒`)
}


export default update
