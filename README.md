# tinypng-plus 图片压缩命令行工具

可选择是否递归处理和覆盖原文件；支持压缩指定文件或目录，也可指定输出目录。
tinypng-plus 是基于[tinypng](https://tinypng.com/) 开发的，压缩质量同 tinypng。

<br/>

## 使用方法

安装：

```bash
npm install tinypng-plus -g
```

然后，在命令行进入到你想要压缩图片的目录，执行：

```bash
tinypng-plus
```

<br/>

## 指令说明

#### 用法:

```bash
tinypng-plus [选项]
```

#### 选项:

- `--path <路径>` 指定输入的路径(可以是目录，也可以是文件)。默认值为当前目录。
- `--output <路径>` 指定输出目录的路径。默认值为输入目录下的 "output" 目录。
- `-r` 递归(recursive)地压缩处理所有目录下的图片。（无参数）
- `-f` 压缩后的图片强制(force)覆盖原图片。（无参数）

#### 其他选项:

- `--help` 或 `-h` 显示帮助信息并退出。
- `--version` 或 `-v` 显示工具版本信息并退出。

#### 示例用法:

1. 使用默认参数运行工具(处理当前目录下的所有文件，并将结果保存在当前目录的 output 目录中):

```bash
tinypng-plus
```

2. 递归压缩当前目录下的所有文件，并将结果保存在当前目录的 output 目录中:

```bash
tinypng-plus -r
```

3. 压缩当前目录下的所有文件，并使用结果覆盖原文件:

```bash
tinypng-plus -f
```

4. 递归压缩当前目录下的所有文件，并使用结果覆盖原文件:

```bash
tinypng-plus -rf
```

5. 指定输入目录或文件，并将结果保存在默认的输出目录:

```bash
tinypng-plus --path /path/to/input
```

6. 指定输入目录或文件，并将结果保存在默认的输出目录:

```bash
tinypng-plus --path /path/to/input
tinypng-plus --path /path/to/input/img.png
```

7. 指定输出目录的路径:

```bash
tinypng-plus --out /path/to/output
```

8. 指定输入目录和输出目录的路径:

```bash
tinypng-plus --path /path/to/input --out /path/to/output
```

注意:
`--path` 参数支持目录和文件
`-f` 会覆盖原文件，请根据需求使用。-f 优先级高于--output，即使用-f 后--output 无效。

## 说明

- tinypng 默认是会对用户上传数量有限制的，使用了 `X-Forwarded-For` 头绕过该限制
- 只能压缩小于 5M 的图片，且只支持 png 和 jpg 格式。
