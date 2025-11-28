
function printRed(...msg) {
  console.error('\x1B[31m%s\x1B[0m', ...msg)
}

function printGreen(...msg) {
  console.info('\x1B[32m%s\x1B[0m', ...msg)
}

function printYellow(...msg) {
  console.warn('\x1B[33m%s\x1B[0m', ...msg)
}

function printBlue(...msg) {
  console.debug('\x1B[34m%s\x1B[0m', ...msg)
}

function printMagenta(...msg) {
  console.log('\x1B[35m%s\x1B[0m', ...msg)
}

function printGrey(...msg) {
  console.log('\x1B[2m%s\x1B[0m', ...msg)
}

export {
  printGreen, printBlue, printRed, printYellow, printMagenta, printGrey
}
