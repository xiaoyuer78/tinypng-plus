#!/usr/bin/env node

/**
 *
 * 优化：通过 X-Forwarded-For 添加了动态随机伪IP，绕过 tinypng 的上传数量限制
 *
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const { URL } = require('url')
const readline = require('readline')
const chalk = require('chalk')
const { helpText } = require('./utils/constants')
const {
  checkFileFormatAndSize,
  countFiles,
  delay,
  getRandomIP,
  formatSize,
  formatPercent
} = require('./utils/tools')

chalk.level = 2

/**
 * 【获取命令行参数】
 * 选项:
 *   --path <路径>     指定输入的路径(可以是目录，也可以是文件)。默认值为当前目录。
 *   --output <路径>   指定输出目录的路径。默认值为输入目录下的 "output" 目录。
 *   -r                递归(recursive)地压缩处理所有目录下的图片。（无参数）
 *   -f                压缩后的图片强制(force)覆盖原图片。（无参数）
 *
 * 其他选项:
 *   --help 或 -h            显示帮助信息并退出。
 *   --version 或 -v         显示工具版本信息并退出。
 */

const args = process.argv

// 打印帮助信息
if (args.includes('--help') || args.includes('-h')) {
  console.log(helpText)
  return
}

// 打印版本信息
if (args.includes('--version') || args.includes('-v')) {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
  )
  const version = packageJson.version
  console.log(version)
  return
}

/**  查找 "--path" 参数并获取其值
 *如：tinypng-plus --path /path/to/input
 *args为 [
 *  'D:\\node\\nodejs\\node.exe',
 *  'D:\\node\\nodejs\\node_modules\\tinypng-plus\\index.js',
 *  '--path',
 *  '/path/to/input'
 *]
 */

const pathIndex = args.indexOf('--path')

let rootPath = process.cwd() // 默认要处理的路径（默认是当前目录，也支持具体文件地址）
let rootDirPath = rootPath // 要处理文件的根目录（如rootPath是目录，则同rootPath; 如rootPath是文件地址，则为该文件所在目录）
// 文件输出目录默认为当前目录同级的 原目录名+output 目录
let outputDir = ''

if (pathIndex !== -1 && pathIndex + 1 < args.length) {
  // 指定路径
  rootPath = args[pathIndex + 1]
  if (!fs.existsSync(rootPath)) {
    // throw new Error(rootPath + ' 目录不存在')
    console.log(chalk.red(rootPath + ' 目录或路径不存在'))
    return
  }

  // 如果rootPath是文件，则重新计算rootDirPath
  fs.stat(rootPath, (err, stats) => {
    if (stats.isFile()) {
      // 返回rootPath的目录名
      rootDirPath = path.dirname(rootPath)
    }
  })
}

let isRecursive = false // 是否递归所有目录处理图片
let isForce = false // 是否覆盖原图
args.forEach((arg) => {
  if (arg.startsWith('-')) {
    if (arg.includes('r')) isRecursive = true
    if (arg.includes('f')) isForce = true
  }
})

/**
 * tinypng.com 压缩图片
 * @param {*} filePath // 文件路径
 */

const options = {
  method: 'POST',
  hostname: 'tinypng.com',
  path: '/backend/opt/shrink',
  headers: {
    rejectUnauthorized: false,
    'Postman-Token': Date.now(),
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
  }
}

// 已压缩文件原始总大小
let originalTotalSize = 0
// 已压缩文件压缩后总大小
let compressedTotalSize = 0
// 已处理文件数量
let processedCount = 0
// 压缩成功文件数量
let successCount = 0

// 失败的文件列表
let failList = []
const { count: fileCount, validCount } = countFiles(rootPath, isRecursive)
// console.log('fileCount', fileCount, 'validCount', validCount)

// 默认压缩指定路径内容
compressionWithPath(rootPath)
  .then(async () => {
    // 延时1秒，等待图片下载完成
    // delay(2000)
    // 向用户展示结果
    // resultMessage()
    if (failList.length > 0) {
      // 如果压缩失败的文件数量大于0，则给出重试压缩提示，并执行重新压缩
      tipCompressionWithFileArray(failList)
    }
  })
  .catch(console.error)

/**
 * 根据路径执行压缩
 * @param {*} filePath // 文件路径
 * @param {*} withDir // 如果路径是目录，是否处理目录内的内容。默认为true
 */
async function compressionWithPath(filePath, withDir = true) {
  const stats = await fs.promises.stat(filePath)

  if (withDir && stats.isDirectory()) {
    const files = await fs.promises.readdir(filePath)
    // console.log('files', files)
    // 使用 for...of 循环实现异步顺序执行
    for (const file of files) {
      // isRecursive为true，则继续压缩当前目录下的内容（递归压缩）
      await compressionWithPath(path.join(filePath, file), isRecursive)
    }
  } else if (stats.isFile()) {
    // 检测文件格式和大小
    const checkResult = checkFileFormatAndSize(filePath)
    if (!checkResult.result) {
      return chalkLog({
        imgPath: filePath,
        error: checkResult.message
      })
    }

    const result = await uploadCompressionImg(filePath)
    // console.log('result', result)
    chalkLog(result)
    return result
  }
}

// 提示用户并根据文件数组执行压缩
async function tipCompressionWithFileArray(fileArray) {
  if (!fileArray || fileArray.length === 0) return
  const answer = await askForRetry(fileArray.length)
  if (answer.toLowerCase() === 'y') {
    // 重置已处理文件数量为成功文件数量
    processedCount = successCount

    console.log(chalk.bgYellow.black('准备尝试再次压缩失败文件。\n'))
    // console.log(chalk.blue(`剩余失败文件数：`) + chalk.red(failList.length))

    // 使用 for...of 循环实现异步顺序执行
    for (const file of fileArray) {
      // 压缩指定文件
      const result = (await compressionWithPath(file)) ?? {}
      // 如果压缩成功，则从失败文件中删除已经压缩成功的文件
      if (!result.error) {
        // 从失败文件中删除已经压缩成功的文件
        failList = failList.filter((item) => item !== file)
      }
    }

    if (failList.length !== 0) {
      tipCompressionWithFileArray(failList)
    } else {
      // 正常退出
      process.exit(0)
    }
  } else {
    console.log(chalk.blue('用户取消重试，程序结束\n'))
    resultMessage()
    console.log(chalk.red('\n【压缩失败文件如下：】\n' + failList.join('\n')))
    // 正常退出
    process.exit(0)
  }
}

// 添加用户交互函数
function askForRetry(failCount) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(
      chalk.yellow(
        `\n发现 ${failCount} 个文件压缩失败，是否尝试重新压缩？(Y/N) `
      ),
      (answer) => {
        rl.close()
        resolve(answer)
      }
    )
  })
}

// 异步API,上传压缩图片
// {"error":"Bad request","message":"Request is invalid"}
// {"input": { "size": 887, "type": "image/png" },
// "output": { "size": 785, "type": "image/png", "width": 81, "height": 81, "ratio": 0.885, "url": "https://tinypng.com/web/output/7aztz90nq5p9545zch8gjzqg5ubdatd6" }}
function uploadCompressionImg(imgPath) {
  return new Promise((resolve) => {
    // 通过 X-Forwarded-For 头部伪造客户端IP
    options.headers['X-Forwarded-For'] = getRandomIP()
    var req = https.request(options, function (res) {
      res.on('data', (buf) => {
        try {
          let obj = JSON.parse(buf.toString())
          if (obj.error) {
            const msg = `压缩失败！失败原因：${obj.message}\n`
            // console.warn(chalk.red(msg))
            return resolve({ imgPath, error: msg })
          } else {
            // 如果剩余文件数量小于3，则异步执行，阻塞流程，保证压缩成功且下载成功再返回最终结果。
            // 否则同步执行，不需要阻塞。保证压缩成功即可，保证效率。
            if (validCount - processedCount < 3) {
              downloadUpdateFile(imgPath, obj).then((result) => {
                // 文件下载成功后再返回结果
                resolve(result)
              })
            } else {
              downloadUpdateFile(imgPath, obj).then((result) => {
                chalkLog(result)
              })
              // 同步执行，不需要阻塞
              resolve()
            }
          }
        } catch (error) {
          console.error(chalk.red(error))
        }
      })
    })

    req.write(fs.readFileSync(imgPath), 'binary')
    req.on('error', (e) => {
      // console.error(chalk.red(e))
      return resolve({ imgPath, error: e })
    })
    req.end(() => {
      processedCount++
    })
  })
}

// 下载更新文件（该方法会被循环调用）
function downloadUpdateFile(imgPath, obj) {
  return new Promise((resolve) => {
    // 如果不覆盖原文件，则新建文件夹
    if (!isForce) {
      // 获取原目录名并添加output后缀
      const originalDirName = path.basename(rootDirPath)
      // 文件输出目录默认为当前目录同级的 原目录名+output 目录
      outputDir = path.join(
        path.dirname(rootDirPath),
        originalDirName + '_output'
      )
      const outputPathIndex = args.indexOf('--output')
      // 如果有指定输出目录，则以指定目录为准
      if (outputPathIndex !== -1 && outputPathIndex + 1 < args.length) {
        outputDir = args[outputPathIndex + 1]
      }

      imgPath = path.join(outputDir, imgPath.replace(rootDirPath, ''))
      const imgdir = path.dirname(imgPath)

      if (!fs.existsSync(imgdir)) {
        fs.mkdirSync(imgdir, { recursive: true })
      }
    }

    const url = new URL(obj.output.url)
    let req = https.request(url, (res) => {
      let body = ''
      res.setEncoding('binary')
      res.on('data', function (data) {
        body += data
      })

      res.on('end', function () {
        fs.writeFile(imgPath, body, 'binary', (err) => {
          if (obj.error) {
            const msg = `文件写入失败！失败原因：${obj.error}\n`
            // console.error(chalk.red(msg))
            resolve({ imgPath, error: msg })
          } else {
            const msg = `压缩成功，原始大小：${formatSize(
              obj.input.size
            )}，压缩后大小：${formatSize(
              obj.output.size
            )}，优化比例：-${formatPercent(obj.output.ratio)}\n `

            // 统计文件大小信息
            originalTotalSize += obj.input.size
            compressedTotalSize += obj.output.size

            // console.log(chalk.green(msg))
            resolve({ imgPath, message: msg })

            // 压缩成功数累计
            successCount++
          }
        })
      })
    })
    req.on('error', (e) => {
      // console.error(chalk.red(e))
      resolve({ imgPath, error: e })
    })
    req.end()
  })
}

// 结果统计说明
const resultMessage = function () {
  const failCount = failList.length
  console.log(
    chalk.bgBlue(
      `文件总数：${fileCount};`,
      `有效文件总数：${validCount};`,
      '压缩成功数：' + chalk.green(successCount),
      '压缩失败数：' + chalk.red(validCount - successCount) + '\n'
    )
  )
  if (validCount === 0) return
  if (isForce) {
    console.log(chalk.yellow('已开启【覆盖原图】模式，已压缩并覆盖原图\n'))
  } else {
    console.log(chalk.yellow(`已压缩文件输出目录为：${outputDir}\n`))
  }
  console.log(
    // chalk.green(
    `【已压缩文件信息】\n原始总大小：${formatSize(
      originalTotalSize
    )}; 压缩后总大小：${formatSize(
      compressedTotalSize
    )};\n节省总大小：${formatSize(
      originalTotalSize - compressedTotalSize
    )}; 压缩率：${
      compressedTotalSize === 0
        ? 0
        : formatPercent(originalTotalSize / compressedTotalSize)
    }`
    // )
  )
}

// 输出日志（带颜色）
function chalkLog(result) {
  if (!result) return
  console.log(
    `已处理文件数：${processedCount}，待处理文件数：${
      validCount - processedCount
    }`
  )
  if (result.error) {
    if (!failList.includes(result.imgPath)) failList.push(result.imgPath)
    console.error(chalk.red(`${result.imgPath}\n${result.error}`))
  } else {
    console.log(chalk.green(`${result.imgPath}\n${result.message}`))
  }

  // 向用户展示结果
  if (successCount === validCount) {
    console.log(chalk.green('******【所有有效文件压缩完成】******'))
    resultMessage()
  }
}
