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

// 获取命令行参数
const args = process.argv
const helpText = `tinypng-plus 图片压缩命令行工具 - 可选择是否递归处理和覆盖原文件；支持压缩指定文件或目录，也可指定输出目录。

用法:
  tinypng-plus [选项]

选项:
  --path <路径>     指定输入的路径(可以是目录，也可以是文件)。默认值为当前目录。
  --output <路径>   指定输出目录的路径。默认值为输入目录下的 "output" 目录。
  -r                递归(recursive)地压缩处理所有目录下的图片。（无参数）
  -f                压缩后的图片强制(force)覆盖原图片。（无参数）

其他选项:
  --help 或 -h            显示帮助信息并退出。
  --version 或 -v         显示工具版本信息并退出。

示例用法:
  1. 使用默认参数运行工具(处理当前目录下的所有文件，并将结果保存在当前目录的output目录中):
    tinypng-plus

  2. 递归压缩当前目录下的所有文件，并将结果保存在当前目录的output目录中:
    tinypng-plus -r

  3. 压缩当前目录下的所有文件，并使用结果覆盖原文件:
    tinypng-plus -f

  4. 递归压缩当前目录下的所有文件，并使用结果覆盖原文件:
    tinypng-plus -rf

  5. 指定输入目录或文件，并将结果保存在默认的输出目录:
    tinypng-plus --path /path/to/input

  6. 指定输入目录或文件，并将结果保存在默认的输出目录:
    tinypng-plus --path /path/to/input
    tinypng-plus --path /path/to/input/img.png

  7. 指定输入目录和输出目录的路径:
    tinypng-plus --path /path/to/input --out /path/to/output

注意:
  --path参数支持目录和文件
  -f会覆盖原文件，请根据需求使用。-f优先级高于--output，即使用-f后--output无效。
`

if (args.includes('--help') || args.includes('-h')) {
  console.log(helpText)
  return
}

if (args.includes('--version') || args.includes('-v')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  const version = packageJson.version
  console.log(version)
  return
}

// 查找 "--path" 参数并获取其值
const pathIndex = args.indexOf('--path')

let rootPath = process.cwd() // 默认要处理的路径（默认是当前目录，也支持具体文件地址）
let rootDirPath = rootPath // 要处理文件的根目录（如rootPath是目录，则同rootPath; 如rootPath是文件地址，则为该文件所在目录）

if (pathIndex !== -1 && pathIndex + 1 < args.length) {
  rootPath = args[pathIndex + 1]
  if (!fs.existsSync(rootPath)) {
    throw new Error(rootPath + ' 目录不存在')
  }

  // 如果rootPath是文件，则重新计算rootDirPath
  fs.stat(rootPath, (err, stats) => {
    if (stats.isFile()) {
      // const index = rootPath.lastIndexOf('/')
      // rootDirPath = rootPath.slice(0, index + 1)

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

const exts = ['.jpg', '.png']
const max = 5200000 // 5MB == 5242848.754299136

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

// 默认压缩指定路径内容
compressionWithPath(rootPath)

/**
 * 根据路径执行压缩
 * @param {*} filePath // 文件路径
 * @param {*} withDir // 如果路径是目录，是否处理目录内的内容。默认为true
 */
function compressionWithPath(filePath, withDir = true) {
  fs.stat(filePath, (err, stats) => {
    if (err) return console.error(err)

    if (withDir && stats.isDirectory()) {
      // 获取文件列表
      fs.readdir(filePath, (err, files) => {
        if (err) console.error(err)
        files.forEach((file) => {
          // isRecursive为true，则继续压缩当前目录下的内容（递归压缩）
          compressionWithPath(path.join(filePath, file), isRecursive)
        })
      })
    } else if (stats.isFile()) {
      // 必须是文件，小于5MB
      if (stats.size > max) {
        return console.warn(`文件${imgPath}超过5M，无法压缩`)
      }
      uploadCompressionImg(filePath)
    }
  })
}

// 生成随机IP， 赋值给 X-Forwarded-For
function getRandomIP() {
  return Array.from(Array(4))
    .map(() => parseInt(Math.random() * 255))
    .join('.')
}

// 异步API,上传压缩图片
// {"error":"Bad request","message":"Request is invalid"}
// {"input": { "size": 887, "type": "image/png" },"output": { "size": 785, "type": "image/png", "width": 81, "height": 81, "ratio": 0.885, "url": "https://tinypng.com/web/output/7aztz90nq5p9545zch8gjzqg5ubdatd6" }}
function uploadCompressionImg(imgPath) {
  if (!exts.includes(path.extname(imgPath))) {
    return console.warn(`${imgPath}：只支持压缩png、jpg格式图片`)
  }

  // 通过 X-Forwarded-For 头部伪造客户端IP
  options.headers['X-Forwarded-For'] = getRandomIP()
  var req = https.request(options, function (res) {
    res.on('data', (buf) => {
      let obj = JSON.parse(buf.toString())
      if (obj.error) {
        console.log(`[${imgPath}]：压缩失败！报错：${obj.message}`)
      } else {
        fileUpdate(imgPath, obj)
      }
    })
  })

  req.write(fs.readFileSync(imgPath), 'binary')
  req.on('error', (e) => {
    console.error(e)
  })
  req.end()
}

// 该方法被循环调用,请求图片数据
function fileUpdate(imgPath, obj) {
  // 如果不覆盖原文件，则新建文件夹
  if (!isForce) {
    // 文件输出目录默认为当前目录下的output目录
    let outputDir = path.join(rootDirPath, 'output')
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
        if (err) return console.error(err)
        console.log(
          `[${imgPath}] \n 压缩成功，原始大小-${obj.input.size}，压缩大小-${obj.output.size}，优化比例-${obj.output.ratio} \n `
        )
      })
    })
  })
  req.on('error', (e) => {
    console.error(e)
  })
  req.end()
}
