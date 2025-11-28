// 用户id
const userId = process.env.muserId || ""
// 用户token 可以使用网页登录获取
const token = process.env.mtoken || ""
// 本地运行端口号
const port = process.env.mport || 1234
// 访问地址，用于epg和节目访问。
// 部署后访问地址是什么就填什么，默认只可本机使用
const host = process.env.mhost || "http://localhost:1234"
// 画质
// 4蓝光(需要登录且账号有VIP)
// 3高清
// 2标清
const rateType = process.env.mrateType || 3

const ipWhiteFile = process.env.APP_FILE_IP_WHITE || (process.cwd() + "/ipwhite.txt");

export { userId, token, port, host, rateType, ipWhiteFile }
