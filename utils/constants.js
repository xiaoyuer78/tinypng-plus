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

module.exports = {
  helpText
}
