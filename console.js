// 定义颜色转义序列
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
};

// 打印不同颜色的文本
console.log(`${colors.red}这是红色文本${colors.reset}`);
console.log(`${colors.green}这是绿色文本${colors.reset}`);
console.log(`${colors.yellow}这是黄色文本${colors.reset}`);
console.log(`${colors.blue}这是蓝色文本${colors.reset}`);
