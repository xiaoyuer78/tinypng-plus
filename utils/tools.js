const fs = require('fs')
const path = require('path')

// 检测路径的文件大小是否小于5M，且格式为图片
function checkFileFormatAndSize(filePath) {
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const max = 5
  const size = fs.statSync(filePath).size

  if (!exts.includes(path.extname(filePath))) {
    // 支持的图片格式
    const supportFormat = exts.map((ext) => ext.slice(1)).join('、')
    const message = `只支持压缩${supportFormat}格式的图片`
    // console.warn(chalk.red(msg))
    return { result: false, message }
  }

  if (size > max * 1024 * 1024) {
    const message = `文件大小不能超过${max}M`
    return { result: false, message }
  }
  return { result: true, message: '文件格式和大小检测通过' }
}

// 计算指定目录下文件数量
function countFiles(dirPath) {
  const files = fs.readdirSync(dirPath)
  // 总文件数量
  let count = 0
  // 有效文件数量
  let validCount = 0
  files.forEach((file) => {
    const filePath = path.join(dirPath, file)
    const stats = fs.statSync(filePath)
    if (stats.isFile()) {
      count++
      if (checkFileFormatAndSize(filePath).result) {
        validCount++
      }
    } else if (stats.isDirectory()) {
      countFiles(filePath)
    }
  })
  return { count, validCount }
}
// 延迟指定时间
function delay(time = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, time)
  })
}

// 随机指定时间内延迟, 默认0.5秒
function randomDelay(time = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, Math.random() * time)
  })
}

// 生成随机IP， 赋值给 X-Forwarded-For
function getRandomIP() {
  return Array.from(Array(4))
    .map(() => parseInt(Math.random() * 255))
    .join('.')
}

// 文件大小单位由K转换为KB或MB（保证数值大于1）
function formatSize(size) {
  if (size < 1024) return size + 'K'
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + 'KB'
  return (size / 1024 / 1024).toFixed(2) + 'MB'
}

// 把小数转成百分比
function formatPercent(percent) {
  return ((1 - percent) * 100).toFixed(2) + '%'
}

module.exports = {
  checkFileFormatAndSize,
  countFiles,
  delay,
  randomDelay,
  getRandomIP,
  formatSize,
  formatPercent
}
