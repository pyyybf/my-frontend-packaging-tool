/**
 * 词法分析 lexical
 */

var fs = require('fs');

const wordList = ['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'await', 'as', 'in', 'of']

exports.tokenize = function (sourcePath) {
    var oriCode = fs.readFileSync(sourcePath, 'utf8');
    var tokens = []

    var curToken = '';
    var i = 0;
    while (i < oriCode.length) {
        // console.log(oriCode[i])
        if (oriCode[i].match(/[\s]/)) {  //空白字符，结束词输入
            i++;
        } else if (oriCode[i] === '/' && oriCode[i + 1] === '/') {  //注释
            while (!oriCode[i].match(/[\n\r]/)) {
                i++;
            }
        } else if (oriCode[i] === '/' && oriCode[i + 1] === '*') {  //注释
            while (!(oriCode[i - 1] === '*' && oriCode[i] === '/')) {
                i++;
            }
            i++;
        } else if (oriCode[i].match(/[0-9]/)) { //新数字
            if (oriCode[i] === '0' && oriCode[i + 1].match(/[boBO]/)) {
                var number = 0;
                if (oriCode[i + 1].match(/[bB]/)) {
                    i += 2;
                    while (oriCode[i].match(/[01]/)) {
                        number = number * 2 + Number(oriCode[i]);
                        i++;
                    }
                } else if (oriCode[i + 1].match(/[oO]/)) {
                    i += 2;
                    while (oriCode[i].match(/[0-7]/)) {
                        number = number * 8 + Number(oriCode[i]);
                        i++;
                    }
                }
                tokens.push({
                    type: 'Numeric',
                    value: number.toString(),
                })
            } else {
                while (i < oriCode.length && oriCode[i].match(/[0-9\.]/)) {
                    curToken += oriCode[i];
                    i++;
                }
                tokens.push({
                    type: 'Numeric',
                    value: curToken,
                })
            }
        } else if (oriCode[i].match(/[a-zA-Z_]/)) {
            while (i < oriCode.length && oriCode[i].match(/[0-9a-zA-Z_]/)) {
                curToken += oriCode[i];
                i++;
            }
            if (wordList.includes(curToken)) {
                tokens.push({
                    type: curToken.toUpperCase(),
                    value: curToken,
                })
            } else if (curToken === 'true' || curToken === 'false') {
                tokens.push({
                    type: 'Boolean',
                    value: curToken,
                })
            } else {
                tokens.push({
                    type: 'Identifier',
                    value: curToken,
                })
            }
        } else if (oriCode[i] === '`') {
            curToken = '`';
            i++;
            while ((oriCode[i] !== '$' || oriCode[i + 1] !== '{') && oriCode[i] !== '`') {
                curToken += oriCode[i];
                i++;
            }
            if (oriCode[i] === '$') {
                curToken += '${';
                tokens.push({
                    type: 'Template',
                    value: curToken,
                })
                curToken = '';
                i += 2;
                while (oriCode[i] !== '}') {
                    curToken += oriCode[i];
                    i++;
                }
                tokens.push({
                    type: 'Identifier',
                    value: curToken.replace(' ', ''),
                })
                curToken = '';
                while (oriCode[i] !== '`') {
                    curToken += oriCode[i];
                    i++;
                }
                tokens.push({
                    type: 'Template',
                    value: curToken + '`',
                })
                curToken = '';
                i++;
            } else {
                curToken += '`';
                tokens.push({
                    type: 'Template',
                    value: curToken,
                })
                curToken = '';
                i++;
            }
        } else if (oriCode[i] === '"' || oriCode[i] === "'") {
            var curSymbol = oriCode[i];
            i++;
            while (oriCode[i - 1] === '\\' || oriCode[i] !== curSymbol) {
                if (oriCode[i] !== '\\') {
                    curToken += oriCode[i];
                }
                i++;
            }
            tokens.push({
                type: 'String',
                value: "'" + curToken + "'",
            })
            i++;
        } else if (oriCode[i].match(/[\(\)\[\]\{\};,]/)) {
            var type = '';
            switch (oriCode[i]) {
                case '(':
                    type = 'LP';
                    break;
                case ')':
                    type = 'RP';
                    break;
                case '[':
                    type = 'LB';
                    break;
                case ']':
                    type = 'RB';
                    break;
                case '{':
                    type = 'LC';
                    break;
                case '}':
                    type = 'RC';
                    break;
                case ';':
                    type = 'SEMI';
                    break;
                case ',':
                    type = 'COMMA';
                    break;
            }
            tokens.push({
                type: type,
                value: oriCode[i],
            })
            i++;
        } else if (oriCode[i].match(/[\+\-\*\/\%\=\>\<\^\~\&\|\!\?\:\.]/)) {
            switch (oriCode.substr(i, 3)) {
                // case '**=':
                // case '<<=':
                // case '>>=':
                // case '>>>':
                //     tokens.push({
                //         type: 'RELOP',
                //         value: oriCode.substr(i, 3),
                //     })
                //     i += 3;
                //     continue;
                case '===':
                case '!==':
                    tokens.push({
                        type: 'OP_TWO',
                        value: oriCode.substr(i, 3),
                    })
                    i += 3;
                    continue;
                case '...':
                    tokens.push({
                        type: 'SPREAD',
                        value: oriCode.substr(i, 3),
                    })
                    i += 3;
                    continue;
            }
            switch (oriCode.substr(i, 2)) {
                case '++':
                case '--':
                    tokens.push({
                        type: 'OP_UPDATE',
                        value: oriCode.substr(i, 2),
                    })
                    i += 2;
                    continue;
                case '+=':
                case '-=':
                case '*=':
                case '/=':
                case '%=':
                case '&=':
                case '|=':
                case '^=':
                case '**':
                case '<<':
                case '>>':
                case '&&':
                case '||':
                case '??':
                case '==':
                case '>=':
                case '<=':
                case '!=':
                    tokens.push({
                        type: 'OP_TWO',
                        value: oriCode.substr(i, 2),
                    })
                    i += 2;
                    continue;
                case '=>':
                    tokens.push({
                        type: 'ARROW',
                        value: oriCode.substr(i, 2),
                    })
                    i += 2;
                    continue;
            }
            var type = '';
            switch (oriCode[i]) {
                case '+':
                case '-':
                case '*':
                case '/':
                case '%':
                case '&':
                case '|':
                case '>':
                case '<':
                case '^':
                    type = 'OP_TWO';
                    break;
                case '!':
                    type = 'OP_LEFT';
                    break;
                case '=':
                    type = 'ASSIGN';
                    break;
                case '?':
                    type = 'QUESTION';
                    break;
                case ':':
                    type = 'COLON';
                    break;
                case '.':
                    type = 'DOT';
                    break;
            }
            tokens.push({
                type: type,
                value: oriCode[i],
            })
            i++;
        } else {
            i++;
        }
        curToken = '';
    }

    return tokens;
}
