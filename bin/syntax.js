/**
 * 文法分析 syntax
 */

var fs = require('fs');
var sourceType = 'script';

// Expression
var parseExpression = function (exp) {
    if (exp.length === 0) {
        return null;
    }
    // 4种单项
    if (exp.length === 1) {
        if (exp[0].type === 'Identifier') {
            return {
                type: 'Identifier',
                name: exp[0].value
            }
        } else if (exp[0].type === 'String') {
            return {
                type: 'Literal',
                value: exp[0].value.slice(1, -1),
                raw: exp[0].value
            }
        } else if (exp[0].type === 'Numeric') {
            return {
                type: 'Literal',
                value: Number(exp[0].value),
                raw: exp[0].value
            }
        } else if (exp[0].type === 'Boolean') {
            return {
                type: 'Literal',
                value: Boolean(exp[0].value === 'true' ? 1 : 0),
                raw: exp[0].value
            }
        } else if (exp[0].type === 'THIS') {
            return {
                type: 'ThisExpression'
            }
        }
    }  //有return

    var i = len - 1;

    // 判断SequenceExpression（是否在括号不缺的情况下有逗号COMMA）
    var brackets = {c: 0, b: 0, p: 0};
    var ifSequenceExpression = false;
    for (i = 0; i < exp.length; i++) {
        if (exp[i].type === 'LC') {
            brackets.c++;
        } else if (exp[i].type === 'RC') {
            brackets.c--;
        } else if (exp[i].type === 'LB') {
            brackets.b++;
        } else if (exp[i].type === 'RB') {
            brackets.b--;
        } else if (exp[i].type === 'LP') {
            brackets.p++;
        } else if (exp[i].type === 'RP') {
            brackets.p--;
        }
        if (exp[i].type === 'COMMA' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
            ifSequenceExpression = true;
            break;
        }
    }
    if (ifSequenceExpression) {
        var sequenceExpression = {
            type: 'SequenceExpression',
            expressions: []
        }
        var curExp = [];
        for (let i = 0; i < exp.length; i++) {
            if (exp[i].type === 'LC') {
                brackets.c++;
            } else if (exp[i].type === 'RC') {
                brackets.c--;
            } else if (exp[i].type === 'LB') {
                brackets.b++;
            } else if (exp[i].type === 'RB') {
                brackets.b--;
            } else if (exp[i].type === 'LP') {
                brackets.p++;
            } else if (exp[i].type === 'RP') {
                brackets.p--;
            }
            if (exp[i].type === 'COMMA' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                sequenceExpression.expressions.push(parseExpression(curExp));
                curExp = [];
            } else {
                curExp.push(exp[i]);
            }
        }
        sequenceExpression.expressions.push(parseExpression(curExp));
        return sequenceExpression;
    } //有return

    //从左往右判断是否有=
    brackets = {c: 0, b: 0, p: 0};
    var ifAssignmentExpression = false;
    for (i = 0; i < exp.length; i++) {
        if (exp[i].type === 'LC') {
            brackets.c++;
        } else if (exp[i].type === 'RC') {
            brackets.c--;
        } else if (exp[i].type === 'LB') {
            brackets.b++;
        } else if (exp[i].type === 'RB') {
            brackets.b--;
        } else if (exp[i].type === 'LP') {
            brackets.p++;
        } else if (exp[i].type === 'RP') {
            brackets.p--;
        }
        if (exp[i].type === 'ASSIGN' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
            ifAssignmentExpression = true;
            break; //当前i为ASSIGN
        }
    }
    if (ifAssignmentExpression) {
        return {
            type: 'AssignmentExpression',
            operator: '=',
            left: parseAssignmentLeft(exp.slice(0, i)),
            right: parseExpression(exp.slice(i + 1))
        }
    } //有return

    //从左往右判断是否有=>
    brackets = {c: 0, b: 0, p: 0};
    var ifArrowFunctionExpression = false;
    for (i = 0; i < exp.length; i++) {
        if (exp[i].type === 'LC') {
            brackets.c++;
        } else if (exp[i].type === 'RC') {
            brackets.c--;
        } else if (exp[i].type === 'LB') {
            brackets.b++;
        } else if (exp[i].type === 'RB') {
            brackets.b--;
        } else if (exp[i].type === 'LP') {
            brackets.p++;
        } else if (exp[i].type === 'RP') {
            brackets.p--;
        }
        if (exp[i].type === 'ARROW' && exp[i + 1].type !== 'LC' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
            ifArrowFunctionExpression = true;
            break; //当前i为ARROW
        }
    }
    if (ifArrowFunctionExpression) {
        exp.splice(i + 1, 0, {
            type: 'LC',
            value: '{'
        })
        exp.push({
            type: 'SEMI',
            value: ';'
        })
        exp.push({
            type: 'RC',
            value: '}'
        })
        var arrowFunctionExpression = parseArrowFunctionExpression(exp);
        arrowFunctionExpression.expression = true;
        arrowFunctionExpression.body = arrowFunctionExpression.body.body[0].expression;
        return arrowFunctionExpression;
    } //有return

    if (exp[0].type === 'NEW') {
        var callExpression = parseExpression(exp.slice(1));
        callExpression.type = 'NewExpression';
        return callExpression;
    }

    var expression = {};
    // 从右往左解析这个expression
    var len = exp.length;
    var right = {};

    // UpdateExpression，符号左边只能是Identifier或MemberExpression
    if (exp[len - 1].type === 'OP_UPDATE') {
        right = {
            type: 'UpdateExpression',
            operator: exp[len - 1].value,
            argument: {},
            prefix: false
        }
        brackets = {c: 0, b: 0, p: 0};
        var curExp = [];
        for (i = len - 2; i >= 0; i--) {
            if (exp[i].type === 'LC') {
                brackets.c++;
            } else if (exp[i].type === 'RC') {
                brackets.c--;
            } else if (exp[i].type === 'LB') {
                brackets.b++;
            } else if (exp[i].type === 'RB') {
                brackets.b--;
            } else if (exp[i].type === 'LP') {
                brackets.p++;
            } else if (exp[i].type === 'RP') {
                brackets.p--;
            }
            curExp.push(exp[i]);
            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {  //括号齐了
                if (i > 0) { //左边还有token
                    if (exp[i - 1].type !== 'SUPER' && exp[i - 1].type !== 'THIS'
                        && exp[i - 1].type !== 'Identifier' && exp[i - 1].type !== 'String' && exp[i - 1].type !== 'Numeric' && exp[i - 1].type !== 'Boolean'
                        && exp[i - 1].type !== 'DOT' && exp[i - 1].type !== 'RB' && exp[i - 1].type !== 'RP') { //左边的不能加入
                        break;
                    }
                } else {  //左边没了
                    right.argument = parseMemberExpression(curExp.reverse());
                    return right;
                }
            }
        }
        if (curExp.length === 1) {
            right.argument = parseExpression(curExp);
        } else {
            right.argument = parseMemberExpression(curExp.reverse());
        }
    }
    if (exp[len - 1].type === 'RC') {  //最右边是}
        brackets = {c: 0, b: 0, p: 0};
        var curExp = [];
        i = len - 1;
        for (; i >= 0; i--) {
            if (exp[i].type === 'LC') {
                brackets.c++;
            } else if (exp[i].type === 'RC') {
                brackets.c--;
            } else if (exp[i].type === 'LB') {
                brackets.b++;
            } else if (exp[i].type === 'RB') {
                brackets.b--;
            } else if (exp[i].type === 'LP') {
                brackets.p++;
            } else if (exp[i].type === 'RP') {
                brackets.p--;
            }
            curExp.push(exp[i]);
            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;  //此时i为{
            }
        }
        if (i === 0) {  // 整个exp只有一个对象 ObjectExpression
            return parseObjectExpression(curExp.reverse());
        }
        if (exp[i - 1].type === 'RP') {  //)
            // 普通函数 FunctionExpression
            for (i = i - 1; i >= 0; i--) {
                if (exp[i].type === 'LC') {
                    brackets.c++;
                } else if (exp[i].type === 'RC') {
                    brackets.c--;
                } else if (exp[i].type === 'LB') {
                    brackets.b++;
                } else if (exp[i].type === 'RB') {
                    brackets.b--;
                } else if (exp[i].type === 'LP') {
                    brackets.p++;
                } else if (exp[i].type === 'RP') {
                    brackets.p--;
                }
                curExp.push(exp[i]);
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;  //此时i为(
                }
            }
            i--;  //此时i为function
            curExp.push(exp[i]);
            if (i === 0) {
                return parseFunctionExpression(curExp.reverse());
            }
            right = parseFunctionExpression(curExp.reverse());
        } else if (exp[i - 1].type === 'ARROW') {  //=>
            // 箭头函数 ArrowFunctionExpression
            i--;
            curExp.push(exp[i]);  //箭头进去
            i--;  //当前i为)
            for (; i >= 0; i--) {
                if (exp[i].type === 'LC') {
                    brackets.c++;
                } else if (exp[i].type === 'RC') {
                    brackets.c--;
                } else if (exp[i].type === 'LB') {
                    brackets.b++;
                } else if (exp[i].type === 'RB') {
                    brackets.b--;
                } else if (exp[i].type === 'LP') {
                    brackets.p++;
                } else if (exp[i].type === 'RP') {
                    brackets.p--;
                }
                curExp.push(exp[i]);
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;  //此时i为(
                }
            }
            if (i === 0) {
                return parseArrowFunctionExpression(curExp.reverse());
            }
            right = parseArrowFunctionExpression(curExp.reverse());
        } else {
            // 对象 ObjectExpression
            right = parseObjectExpression(curExp.reverse()); //当前i为{
        }
        //当前i为function或(或{，反正是最右式第一个token
    }
    if (exp[len - 1].type === 'RB') {  //最右边是]
        i = len - 1;
        brackets = {c: 0, b: 0, p: 0};
        var curExp = [];
        for (; i >= 0; i--) {
            if (exp[i].type === 'LC') {
                brackets.c++;
            } else if (exp[i].type === 'RC') {
                brackets.c--;
            } else if (exp[i].type === 'LB') {
                brackets.b++;
            } else if (exp[i].type === 'RB') {
                brackets.b--;
            } else if (exp[i].type === 'LP') {
                brackets.p++;
            } else if (exp[i].type === 'RP') {
                brackets.p--;
            }
            curExp.push(exp[i]);
            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;  //此时i为[
            }
        }
        if (i === 0) {  // 左边没了，数组 ArrayExpression
            return parseArrayExpression(curExp.reverse());
        }
        if (exp[i - 1].type === 'DOT' || exp[i - 1].type === 'RB' || exp[i - 1].type === 'RP' || exp[i - 1].type === 'THIS' || exp[i - 1].type === 'SUPER'
            || exp[i - 1].type === 'Identifier' || exp[i - 1].type === 'String' || exp[i - 1].type === 'Boolean' || exp[i - 1].type === 'Numeric') {
            // 左边的还能加进来，对象属性引用 MemberExpression
            for (i = i - 1; i >= 0; i--) {
                if (exp[i].type === 'LC') {
                    brackets.c++;
                } else if (exp[i].type === 'RC') {
                    brackets.c--;
                } else if (exp[i].type === 'LB') {
                    brackets.b++;
                } else if (exp[i].type === 'RB') {
                    brackets.b--;
                } else if (exp[i].type === 'LP') {
                    brackets.p++;
                } else if (exp[i].type === 'RP') {
                    brackets.p--;
                }
                curExp.push(exp[i]);
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {  //括号齐了
                    if (i > 0) { //左边还有token
                        if (exp[i - 1].type !== 'Identifier' && exp[i - 1].type !== 'String' && exp[i - 1].type !== 'Numeric' && exp[i - 1].type !== 'Boolean'
                            && exp[i - 1].type !== 'SUPER' && exp[i - 1].type !== 'THIS' && exp[i - 1].type !== 'DOT' && exp[i - 1].type !== 'RB' && exp[i - 1].type !== 'RP') { //左边的不能加入
                            break;
                        }
                    } else {  //左边没了
                        return parseMemberExpression(curExp.reverse());
                    }
                }
            }
            right = parseMemberExpression(curExp.reverse());
        } else {
            // 左边不能加进来了，数组 ArrayExpression
            right = parseArrayExpression(curExp.reverse());
        }
    }
    if (exp[len - 1].type === 'RP') {  //最右边是)
        brackets = {c: 0, b: 0, p: 0};
        i = len - 1;
        for (; i >= 0; i--) {
            if (exp[i].type === 'LC') {
                brackets.c++;
            } else if (exp[i].type === 'RC') {
                brackets.c--;
            } else if (exp[i].type === 'LB') {
                brackets.b++;
            } else if (exp[i].type === 'RB') {
                brackets.b--;
            } else if (exp[i].type === 'LP') {
                brackets.p++;
            } else if (exp[i].type === 'RP') {
                brackets.p--;
            }
            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;  //()里跑完了，看括号左边是个啥
            }
        }
        if (i === 0) {  // 整个exp只有单纯一个括号
            return parseExpression(exp.slice(1, -1));  //去掉头尾()
        }
        if (exp[i - 1].type === 'SUPER' || exp[i - 1].type === 'DOT' || exp[i - 1].type === 'RB' || exp[i - 1].type === 'RP' || exp[i - 1].type === 'THIS'
            || exp[i - 1].type === 'Identifier' || exp[i - 1].type === 'String' || exp[i - 1].type === 'Boolean' || exp[i - 1].type === 'Numeric') {
            // 调用函数 CallExpression
            right = {
                type: 'CallExpression',
                callee: null,
                arguments: []
            }
            if (exp[i - 1].type === 'SUPER') {
                right.callee = {
                    type: 'Super'
                }
            }
            brackets = {c: 0, b: 0, p: -1};
            i = len - 2;
            var curExp = [];
            //处理参数
            for (; i >= 0; i--) {
                if (exp[i].type === 'LC') {
                    brackets.c++;
                } else if (exp[i].type === 'RC') {
                    brackets.c--;
                } else if (exp[i].type === 'LB') {
                    brackets.b++;
                } else if (exp[i].type === 'RB') {
                    brackets.b--;
                } else if (exp[i].type === 'LP') {
                    brackets.p++;
                } else if (exp[i].type === 'RP') {
                    brackets.p--;
                }
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    if (curExp.length > 0) {
                        right.arguments.unshift(parseExpression(curExp.reverse()))
                        curExp = [];
                    }
                    break;  //()里跑完了，i当前为(
                } else if (exp[i].type === 'COMMA' && brackets.c === 0 && brackets.b === 0 && brackets.p === -1) {
                    if (curExp.length > 0) {
                        right.arguments.unshift(parseExpression(curExp.reverse()));
                        curExp = [];
                    }
                } else {
                    curExp.push(exp[i]);
                }
            }  //出来的时候i是(
            if (right.callee === null) {
                for (i = i - 1; i >= 0; i--) {
                    if (exp[i].type === 'LC') {
                        brackets.c++;
                    } else if (exp[i].type === 'RC') {
                        brackets.c--;
                    } else if (exp[i].type === 'LB') {
                        brackets.b++;
                    } else if (exp[i].type === 'RB') {
                        brackets.b--;
                    } else if (exp[i].type === 'LP') {
                        brackets.p++;
                    } else if (exp[i].type === 'RP') {
                        brackets.p--;
                    }
                    curExp.push(exp[i]);
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {  //括号齐了
                        if (i > 0) { //左边还有token
                            if (exp[i - 1].type !== 'SUPER' && exp[i - 1].type !== 'THIS'
                                && exp[i - 1].type !== 'Identifier' && exp[i - 1].type !== 'String' && exp[i - 1].type !== 'Numeric' && exp[i - 1].type !== 'Boolean'
                                && exp[i - 1].type !== 'DOT' && exp[i - 1].type !== 'RB' && exp[i - 1].type !== 'RP') { //左边的不能加入
                                break;
                            }
                        } else {  //左边没了
                            if (curExp.length === 1) {
                                right.callee = parseExpression(curExp);
                            } else {
                                right.callee = parseMemberExpression(curExp.reverse());
                            }
                            return right;
                        }
                    }
                }
                if (curExp.length === 1) {
                    right.callee = parseExpression(curExp);
                } else {
                    right.callee = parseMemberExpression(curExp.reverse());
                }
            }
        } else {
            // 单纯一个括号
            brackets = {c: 0, b: 0, p: 0};
            i = len - 1;
            var curExp = [];
            for (; i >= 0; i--) {
                if (exp[i].type === 'LC') {
                    brackets.c++;
                } else if (exp[i].type === 'RC') {
                    brackets.c--;
                } else if (exp[i].type === 'LB') {
                    brackets.b++;
                } else if (exp[i].type === 'RB') {
                    brackets.b--;
                } else if (exp[i].type === 'LP') {
                    brackets.p++;
                } else if (exp[i].type === 'RP') {
                    brackets.p--;
                }
                curExp.push(exp[i]);
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;  //()里跑完了，当前i为(
                }
            }
            right = parseExpression(curExp.slice(1, -1));
        }
    }
    if (exp[len - 1].type === 'Identifier') {
        i = len - 1;
        if (exp[len - 2].type === 'DOT') {
            // 出现DOT，对象属性引用 MemberExpression
            var curExp = [];
            brackets = {c: 0, b: 0, p: 0};
            for (; i >= 0; i--) {
                if (exp[i].type === 'LC') {
                    brackets.c++;
                } else if (exp[i].type === 'RC') {
                    brackets.c--;
                } else if (exp[i].type === 'LB') {
                    brackets.b++;
                } else if (exp[i].type === 'RB') {
                    brackets.b--;
                } else if (exp[i].type === 'LP') {
                    brackets.p++;
                } else if (exp[i].type === 'RP') {
                    brackets.p--;
                }
                curExp.push(exp[i]);
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {  //括号齐了
                    if (i > 0) { //左边还有token
                        if (exp[i - 1].type !== 'SUPER' && exp[i - 1].type !== 'THIS'
                            && exp[i - 1].type !== 'Identifier' && exp[i - 1].type !== 'String' && exp[i - 1].type !== 'Numeric' && exp[i - 1].type !== 'Boolean'
                            && exp[i - 1].type !== 'DOT' && exp[i - 1].type !== 'RB' && exp[i - 1].type !== 'RP') { //左边的不能加入
                            break;
                        }
                    } else {  //左边没了
                        return parseMemberExpression(curExp.reverse());
                    }
                }
            }
            right = parseMemberExpression(curExp.reverse());
        } else {
            // 普通Identifier
            right = {
                type: 'Identifier',
                name: exp[len - 1].value
            }
        }
    }
    if (exp[len - 1].type === 'String') {
        i = len - 1;
        right = {
            type: 'Literal',
            value: exp[len - 1].value.slice(1, -1),
            raw: exp[len - 1].value
        }
    }
    if (exp[len - 1].type === 'Numeric') {
        i = len - 1;
        right = {
            type: 'Literal',
            value: Number(exp[len - 1].value),
            raw: exp[len - 1].value
        }
    }
    if (exp[len - 1].type === 'Boolean') {
        i = len - 1;
        right = {
            type: 'Literal',
            value: Boolean(exp[len - 1].value === 'true' ? 1 : 0),
            raw: exp[len - 1].value
        }
    }
    if (exp[len - 1].type === 'THIS') {
        i = len - 1;
        right = {
            type: 'ThisExpression'
        }
    }
    if (exp[len - 1].type === 'SUPER') {
        i = len - 1;
        right = {
            type: 'Super'
        }
    }
    if (exp[len - 1].type === 'Template') {
        right = {
            type: 'TemplateLiteral',
            quasis: [
                {
                    type: 'TemplateElement',
                    value: {
                        raw: exp[len - 1].value.slice(1, -1),
                        cooked: exp[len - 1].value.slice(1, -1)
                    },
                    tail: true
                }
            ],
            expressions: []
        }
        i = len - 1;
        if (!exp[len - 1].value.startsWith('`')) {
            var curExp = [];
            for (i = len - 2; i >= 0; i--) {
                if (exp[i].type === 'Template') {
                    right.expressions.unshift(parseExpression(curExp.reverse()));
                    curExp = [];
                    right.quasis.unshift({
                        type: 'TemplateElement',
                        value: {
                            raw: exp[i].value.slice(1, -2),
                            cooked: exp[i].value.slice(1, -2)
                        },
                        tail: false
                    })
                    if (exp[i].value.startsWith('`')) {
                        break;
                    }
                } else {
                    curExp.push(exp[i]);
                }
            }
        }
        if (i === 0) {
            return right;
        }
    }

    // 继续解析左边，当前i为最右式的最左一个token，最右式解析为right
    if (i === 0) { //但是保险起见判断一下
        return right;
    }
    i--;
    if (exp[i].type === 'COLON') {
        var colonIdx = i;
        brackets = {c: 0, b: 0, p: 0};
        for (; i >= 0; i--) {
            if (exp[i].type === 'LC') {
                brackets.c++;
            } else if (exp[i].type === 'RC') {
                brackets.c--;
            } else if (exp[i].type === 'LB') {
                brackets.b++;
            } else if (exp[i].type === 'RB') {
                brackets.b--;
            } else if (exp[i].type === 'LP') {
                brackets.p++;
            } else if (exp[i].type === 'RP') {
                brackets.p--;
            }
            if (exp[i].type === 'QUESTION' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;  //当前i为?
            }
        }
        right = {
            type: 'ConditionalExpression',
            test: {},
            consequent: parseExpression(exp.slice(i + 1, colonIdx)),
            alternate: right
        }
        //这要怎么掏出一个test，裂开了
        var questionIdx = i;
        brackets = {c: 0, b: 0, p: 0};
        for (; i >= 0; i--) {
            if (exp[i].type === 'LC') {
                brackets.c++;
            } else if (exp[i].type === 'RC') {
                brackets.c--;
            } else if (exp[i].type === 'LB') {
                brackets.b++;
            } else if (exp[i].type === 'RB') {
                brackets.b--;
            } else if (exp[i].type === 'LP') {
                brackets.p++;
            } else if (exp[i].type === 'RP') {
                brackets.p--;
            }
            if ((exp[i].type === 'OP_UPDATE' || exp[i].type === 'OP_LEFT' || exp[i].type === 'OP_TWO')
                && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;  //当前i为test左边的token
            }
        }
        if (i < 0) {
            right.test = parseExpression(exp.slice(0, questionIdx));
            return right;
        } else {
            right.test = parseExpression(exp.slice(i, questionIdx));
            i++;  //当前i为test最左边的token
        }
        i--;
    }
    if (exp[i].type === 'OP_UPDATE') {
        right = {
            type: 'UpdateExpression',
            operator: exp[i].value,
            argument: right,
            prefix: true
        }
    } else if (exp[i].type === 'OP_LEFT') {
        right = {
            type: 'UnaryExpression',
            operator: exp[i].value,
            argument: right,
            prefix: true
        }
    } else if (exp[i].type === 'SPREAD') {
        right = {
            type: 'SpreadElement',
            argument: right
        }
    }
    if (i === 0) {
        return right;
    }
    if (exp[i].type === 'OP_TWO') {
        expression = {
            type: 'BinaryExpression',
            operator: exp[i].value,
            left: parseExpression(exp.slice(0, i)),
            right: right
        }
    }

    return expression;
}

//objectExpArr包含两边大括号
var parseObjectExpression = function (objectExpArr) {
    var objectExp = {
        type: 'ObjectExpression',
        properties: []
    }

    var i = 1;
    var brackets = {c: 0, b: 0, p: 0};
    var property = [];
    for (; i < objectExpArr.length - 1; i++) {
        if (objectExpArr[i].type === 'LC') {
            brackets.c++;
        } else if (objectExpArr[i].type === 'RC') {
            brackets.c--;
        } else if (objectExpArr[i].type === 'LB') {
            brackets.b++;
        } else if (objectExpArr[i].type === 'RB') {
            brackets.b--;
        } else if (objectExpArr[i].type === 'LP') {
            brackets.p++;
        } else if (objectExpArr[i].type === 'RP') {
            brackets.p--;
        }
        if (objectExpArr[i].type === 'COMMA' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
            if (property.length > 0) {
                objectExp.properties.push(parseProperty(property));
                property = [];
            }
        } else {
            property.push(objectExpArr[i]);
        }
    }
    if (property.length > 0) {
        objectExp.properties.push(parseProperty(property));
    }

    return objectExp;
}

var parseProperty = function (propertyArr) {
    var property = {
        type: 'Property',
        key: {},
        computed: false,
        value: {},
        kind: 'init',
        method: false,
        shorthand: true
    }
    var i = 0;
    if (propertyArr[0].type === 'LB') {
        var brackets = {c: 0, b: 1, p: 0};
        var keyArr = [];
        for (i = 1; i < propertyArr.length; i++) {
            if (propertyArr[i].type === 'LC') {
                brackets.c++;
            } else if (propertyArr[i].type === 'RC') {
                brackets.c--;
            } else if (propertyArr[i].type === 'LB') {
                brackets.b++;
            } else if (propertyArr[i].type === 'RB') {
                brackets.b--;
            } else if (propertyArr[i].type === 'LP') {
                brackets.p++;
            } else if (propertyArr[i].type === 'RP') {
                brackets.p--;
            }
            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;
            }
            keyArr.push(propertyArr[i]);
        }
        property.key = parseExpression(keyArr);
        property.value = parseExpression(keyArr);
        property.computed = true;
    } else {
        property.key = {
            type: 'Identifier',
            name: propertyArr[0].value
        }
        property.value = {
            type: 'Identifier',
            name: propertyArr[0].value
        }
    }
    if (i + 1 < propertyArr.length && propertyArr[i + 1].type === 'COLON') {
        property.value = parseExpression(propertyArr.slice(i + 2));
        property.shorthand = false;
    } else if (i + 1 < propertyArr.length && propertyArr[i + 1].type === 'LP') {
        var functionArr = propertyArr.slice(i + 1);
        functionArr.unshift({
            type: 'FUNCTION',
            value: 'function'
        })
        property.value = parseFunctionExpression(functionArr);
        property.shorthand = false;
        property.method = true;
    }
    return property;
}

var parseMemberExpression = function (memberExpArr) {
    var memberExp = {
        type: 'MemberExpression',
        computed: false,
        object: {},
        property: {}
    }

    var objectArr = [];
    var brackets = {c: 0, b: 0, p: 0};
    var i = 0;
    for (; i < memberExpArr.length; i++) {
        if (memberExpArr[i].type === 'LC') {
            brackets.c++;
        } else if (memberExpArr[i].type === 'RC') {
            brackets.c--;
        } else if (memberExpArr[i].type === 'LB') {
            brackets.b++;
        } else if (memberExpArr[i].type === 'RB') {
            brackets.b--;
        } else if (memberExpArr[i].type === 'LP') {
            brackets.p++;
        } else if (memberExpArr[i].type === 'RP') {
            brackets.p--;
        }
        if (memberExpArr[i].type === 'DOT' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
            memberExp.object = parseExpression(objectArr);
            memberExp.property = parseMemberExpression(memberExpArr.slice(i + 1));
            memberExp.computed = false;
            break;
        } else if (objectArr.length > 0 && memberExpArr[i].type === 'LB' && brackets.c === 0 && brackets.b === 1 && brackets.p === 0) {
            memberExp.object = parseExpression(objectArr);
            memberExp.property = parseMemberExpression(memberExpArr.slice(i + 1, -1));
            memberExp.computed = true;
            break;
        }
        objectArr.push(memberExpArr[i]);
    }
    if (i === memberExpArr.length) {  //没.和[
        return parseExpression(memberExpArr);
    }
    return memberExp;
}

var parseAssignmentLeft = function (leftArr) {
    if (leftArr.length === 1) {
        return {
            type: 'Identifier',
            name: leftArr[0].value
        }
    }
    if (leftArr[0].type === 'LB') {
        return parseArrayPattern(leftArr.slice(1, -1));
    } else {
        return parseMemberExpression(leftArr);
    }
}

var parseArrayExpression = function (arrayExpArr) {
    var arrayExp = {
        type: 'ArrayExpression',
        elements: []
    }

    var brackets = {c: 0, b: 0, p: 0};
    var curElement = [];
    for (let i = 0; i < arrayExpArr.length; i++) {
        if (arrayExpArr[i].type === 'LC') {
            brackets.c++;
        } else if (arrayExpArr[i].type === 'RC') {
            brackets.c--;
        } else if (arrayExpArr[i].type === 'LB') {
            brackets.b++;
        } else if (arrayExpArr[i].type === 'RB') {
            brackets.b--;
        } else if (arrayExpArr[i].type === 'LP') {
            brackets.p++;
        } else if (arrayExpArr[i].type === 'RP') {
            brackets.p--;
        }
        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
            if (curElement.length > 0) {
                arrayExp.elements.push(parseExpression(curElement));
                curElement = [];
            }
            break;
        } else if (arrayExpArr[i].type === 'COMMA' && brackets.c === 0 && brackets.b === 1 && brackets.p === 0) {
            if (curElement.length > 0) {
                arrayExp.elements.push(parseExpression(curElement));
                curElement = [];
            }
        } else {
            curElement.push(arrayExpArr[i])
        }
    }

    return arrayExp;
}

// 解析普通函数
var parseFunctionExpression = function (exp) {
    var functionExpression = {
        type: 'FunctionExpression',
        id: null,
        params: [],
        body: {},
        generator: false,
        expression: false,
        async: false
    }

    var args = [], curArg = [], brackets = {
        c: 0,
        b: 0,
        p: 0
    };
    // 获取参数列表args
    var i = 2;
    while (brackets.p > -1) {
        if (exp[i].type === 'LC') {
            brackets.c++;
        } else if (exp[i].type === 'RC') {
            brackets.c--;
        } else if (exp[i].type === 'LB') {
            brackets.b++;
        } else if (exp[i].type === 'RB') {
            brackets.b--;
        } else if (exp[i].type === 'LP') {
            brackets.p++;
        } else if (exp[i].type === 'RP') {
            brackets.p--;
        }
        if (brackets.p === -1 || (exp[i].type === 'COMMA' && brackets.b === 0 && brackets.c === 0 && brackets.p === 0)) {
            args.push(curArg);
            curArg = [];
        } else {
            curArg.push(exp[i]);
        }
        i++;
    }
    for (var arg of args) {
        var param = null;
        if (arg.length === 0) {
            break;
        } else if (arg.length === 1) {
            param = {
                type: 'Identifier',
                name: arg[0].value
            }
        } else if (arg[0].type === 'SPREAD') {
            param = {
                type: 'RestElement',
                argument: {
                    type: 'Identifier',
                    name: arg[1].value
                }
            }
        } else {
            param = {
                type: 'AssignmentPattern',
                left: {
                    type: 'Identifier',
                    name: arg[0].value
                },
                right: parseExpression(arg.slice(2))
            }
        }
        functionExpression.params.push(param);
    }

    functionExpression.body = parseBlockStatement(exp.slice(i + 1, exp.length - 1))
    return functionExpression;
}

// 解析箭头函数
var parseArrowFunctionExpression = function (exp) {
    var arrowFunctionExpression = {
        type: 'ArrowFunctionExpression',
        id: null,
        params: [],
        body: {},
        generator: false,
        expression: false,
        async: false
    }

    // 先解析参数
    var args = [], curArg = [], brackets = {
        c: 0,
        b: 0,
        p: 0
    };
    var i = 0;
    while (exp[i].type !== 'ARROW') {
        curArg = [];
        do {
            if (exp[i].type === 'LC') {
                brackets.c++;
            } else if (exp[i].type === 'RC') {
                brackets.c--;
            } else if (exp[i].type === 'LB') {
                brackets.b++;
            } else if (exp[i].type === 'RB') {
                brackets.b--;
            } else if (exp[i].type === 'LP') {
                brackets.p++;
            } else if (exp[i].type === 'RP') {
                brackets.p--;
            }
            curArg.push(exp[i]);
            i++;
        } while (!((exp[i].type === 'COMMA' && brackets.c === 0 && brackets.b === 0 && brackets.p < 2) || brackets.p === 0));
        args.push(curArg);
    }
    if (args[0][0].type === 'LP') {
        args[0].splice(0, 1);
        args[args.length - 1].pop();
    }
    for (var j = 1; j < args.length; j++) {
        args[j].splice(0, 1);
    }

    for (var arg of args) {
        var param = null;
        if (arg.length === 0) {
            break;
        } else if (arg.length === 1) {
            param = {
                type: 'Identifier',
                name: arg[0].value
            }
        } else if (arg[0].type === 'SPREAD') {
            param = {
                type: 'RestElement',
                argument: {
                    type: 'Identifier',
                    name: arg[0].value
                }
            }
        } else {
            param = {
                type: 'AssignmentPattern',
                left: {
                    type: 'Identifier',
                    name: arg[0].value
                },
                right: parseExpression(arg.slice(2))
            }
        }
        arrowFunctionExpression.params.push(param);
    }

    arrowFunctionExpression.body = parseBlockStatement(exp.slice(i + 2, exp.length - 1))
    return arrowFunctionExpression;
}

/**
 * ====================================================================================================
 *                                         以上解析Expression
 * ====================================================================================================
 */

// IMPORT，importDeclarationArr不包含最后的SEMI
var parseImportDeclaration = function (importDeclarationArr) {
    sourceType = 'module';

    var importDeclaration = {
        type: 'ImportDeclaration',
        specifiers: [],
        source: {}
    };
    var i = 1;

    if (importDeclarationArr[i].type === 'LC') {
        while (importDeclarationArr[i].type !== 'RC') {
            i++;
            importDeclaration.specifiers.push({
                type: 'ImportSpecifier',
                local: {
                    type: 'Identifier',
                    name: importDeclarationArr[i + 1].type === 'AS' ? importDeclarationArr[i + 2].value : importDeclarationArr[i].value
                },
                imported: {
                    type: 'Identifier',
                    name: importDeclarationArr[i].value
                }
            });
            i += (importDeclarationArr[i + 1].type === 'AS' ? 3 : 1)
        }
    } else {
        importDeclaration.specifiers.push({
            type: 'ImportDefaultSpecifier',
            local: {
                type: 'Identifier',
                name: importDeclarationArr[i].value
            }
        })
    }

    importDeclaration.source = {
        type: 'Literal',
        value: importDeclarationArr[i + 2].value.slice(1, -1),
        raw: importDeclarationArr[i + 2].value
    }

    return importDeclaration;
}

// FUNCTION，functionDeclarationArr包含开头的function
var parseFunctionDeclaration = function (functionDeclarationArr) {
    var functionDeclaration = {
        type: 'FunctionDeclaration',
        id: {
            type: 'Identifier',
            name: functionDeclarationArr[1].value
        },
        params: [],
        body: {},
        generator: false,
        expression: false,
        async: false
    }
    var i = 3;

    var args = [], curArg = [], brackets = {
        c: 0,
        b: 0,
        p: 0
    };
    // 获取参数列表args
    while (brackets.p > -1) {
        if (functionDeclarationArr[i].type === 'LC') {
            brackets.c++;
        } else if (functionDeclarationArr[i].type === 'RC') {
            brackets.c--;
        } else if (functionDeclarationArr[i].type === 'LB') {
            brackets.b++;
        } else if (functionDeclarationArr[i].type === 'RB') {
            brackets.b--;
        } else if (functionDeclarationArr[i].type === 'LP') {
            brackets.p++;
        } else if (functionDeclarationArr[i].type === 'RP') {
            brackets.p--;
        }
        if (brackets.p === -1 || (functionDeclarationArr[i].type === 'COMMA' && brackets.b === 0 && brackets.c === 0 && brackets.p === 0)) {
            if (curArg.length > 0)
                args.push(curArg);
            curArg = [];
        } else {
            curArg.push(functionDeclarationArr[i]);
        }
        i++;
    }

    for (var arg of args) {
        var param = null;
        if (arg.length === 1) {
            param = {
                type: 'Identifier',
                name: arg[0].value
            }
        } else if (arg[0].type === 'SPREAD') {
            param = {
                type: 'RestElement',
                argument: {
                    type: 'Identifier',
                    name: arg[1].value
                }
            }
        } else {
            param = {
                type: 'AssignmentPattern',
                left: {
                    type: 'Identifier',
                    name: arg[0].value
                },
                right: parseExpression(arg.slice(2))
            }
        }
        functionDeclaration.params.push(param);
    }
    i++;

    var stmtArr = []
    brackets = {
        c: 1,
        b: 0,
        p: 0
    };
    for (; i < functionDeclarationArr.length; i++) {
        if (functionDeclarationArr[i].type === 'LC') {
            brackets.c++;
        } else if (functionDeclarationArr[i].type === 'RC') {
            brackets.c--;
        } else if (functionDeclarationArr[i].type === 'LB') {
            brackets.b++;
        } else if (functionDeclarationArr[i].type === 'RB') {
            brackets.b--;
        } else if (functionDeclarationArr[i].type === 'LP') {
            brackets.p++;
        } else if (functionDeclarationArr[i].type === 'RP') {
            brackets.p--;
        }
        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
            break;
        }
        stmtArr.push(functionDeclarationArr[i]);
    }

    functionDeclaration.body = parseBlockStatement(stmtArr)

    return functionDeclaration;
}

// VAR或LET，不包含最后的SEMI
var parseVariableDeclaration = function (variableDeclarationArr) {
    var variableDeclaration = {
        type: 'VariableDeclaration',
        declarations: [],
        kind: variableDeclarationArr[0].type.toLowerCase()
    }

    var i = 0;
    while (i < variableDeclarationArr.length - 1) {
        i++;
        // 解析VariableDeclarator
        var variableDeclarator = {};
        if (variableDeclarationArr[i].type === 'LC') {
            variableDeclarator = {
                type: 'VariableDeclarator',
                id: {},
                init: null
            };
            var objectPattern = [];
            var brackets = {
                c: 1,
                b: 0,
                p: 0
            }
            for (i = i + 1; i < variableDeclarationArr.length; i++) {
                if (variableDeclarationArr[i].type === 'LC') {
                    brackets.c++;
                } else if (variableDeclarationArr[i].type === 'RC') {
                    brackets.c--;
                } else if (variableDeclarationArr[i].type === 'LB') {
                    brackets.b++;
                } else if (variableDeclarationArr[i].type === 'RB') {
                    brackets.b--;
                } else if (variableDeclarationArr[i].type === 'LP') {
                    brackets.p++;
                } else if (variableDeclarationArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;
                }
                objectPattern.push(variableDeclarationArr[i]);
            }
            variableDeclarator.id = parseObjectPattern(objectPattern);
        } else if (variableDeclarationArr[i].type === 'LB') {
            variableDeclarator = {
                type: 'VariableDeclarator',
                id: {},
                init: null
            };
            var arrayPattern = [];
            var brackets = {
                c: 0,
                b: 1,
                p: 0
            }
            for (i = i + 1; i < variableDeclarationArr.length; i++) {
                if (variableDeclarationArr[i].type === 'LC') {
                    brackets.c++;
                } else if (variableDeclarationArr[i].type === 'RC') {
                    brackets.c--;
                } else if (variableDeclarationArr[i].type === 'LB') {
                    brackets.b++;
                } else if (variableDeclarationArr[i].type === 'RB') {
                    brackets.b--;
                } else if (variableDeclarationArr[i].type === 'LP') {
                    brackets.p++;
                } else if (variableDeclarationArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;
                }
                arrayPattern.push(variableDeclarationArr[i]);
            }
            variableDeclarator.id = parseArrayPattern(arrayPattern);
        } else {
            variableDeclarator = {
                type: 'VariableDeclarator',
                id: {
                    type: 'Identifier',
                    name: variableDeclarationArr[i].value
                },
                init: null
            };
        }
        //i为等号/逗号/结尾前的元素
        i++;
        if (i < variableDeclarationArr.length && variableDeclarationArr[i].type === 'ASSIGN') { // 等号，有初始化值
            i++;
            var exp = [], brackets = {
                c: 0,
                b: 0,
                p: 0
            };
            for (; i < variableDeclarationArr.length; i++) {
                if (variableDeclarationArr[i].type === 'LC') {
                    brackets.c++;
                } else if (variableDeclarationArr[i].type === 'RC') {
                    brackets.c--;
                } else if (variableDeclarationArr[i].type === 'LB') {
                    brackets.b++;
                } else if (variableDeclarationArr[i].type === 'RB') {
                    brackets.b--;
                } else if (variableDeclarationArr[i].type === 'LP') {
                    brackets.p++;
                } else if (variableDeclarationArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (variableDeclarationArr[i].type === 'COMMA' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;
                }
                exp.push(variableDeclarationArr[i]);
            }
            variableDeclarator.init = parseExpression(exp);
        }
        variableDeclaration.declarations.push(variableDeclarator);
    }

    // top.body.push(variableDeclaration);
    return variableDeclaration;
}

// arrayPatternArr不包含开头结尾的方括号
var parseArrayPattern = function (arrayPatternArr) {
    var arrayPattern = {
        type: 'ArrayPattern',
        elements: []
    }
    var i = 0;
    while (i < arrayPatternArr.length) {
        var element = {}, tmpElement = {};
        if (arrayPatternArr[i].type === 'LB') {
            var subArrayPattern = [];
            var brackets = {
                c: 0,
                b: 1,
                p: 0
            }
            for (i = i + 1; i < arrayPatternArr.length; i++) {
                if (arrayPatternArr[i].type === 'LC') {
                    brackets.c++;
                } else if (arrayPatternArr[i].type === 'RC') {
                    brackets.c--;
                } else if (arrayPatternArr[i].type === 'LB') {
                    brackets.b++;
                } else if (arrayPatternArr[i].type === 'RB') {
                    brackets.b--;
                } else if (arrayPatternArr[i].type === 'LP') {
                    brackets.p++;
                } else if (arrayPatternArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;
                }
                subArrayPattern.push(arrayPatternArr[i]);
            }
            tmpElement = parseArrayPattern(subArrayPattern);
        } else if (arrayPatternArr[i].type === 'LC') {
            var subObjectPattern = [];
            var brackets = {
                c: 1,
                b: 0,
                p: 0
            }
            for (i = i + 1; i < arrayPatternArr.length; i++) {
                if (arrayPatternArr[i].type === 'LC') {
                    brackets.c++;
                } else if (arrayPatternArr[i].type === 'RC') {
                    brackets.c--;
                } else if (arrayPatternArr[i].type === 'LB') {
                    brackets.b++;
                } else if (arrayPatternArr[i].type === 'RB') {
                    brackets.b--;
                } else if (arrayPatternArr[i].type === 'LP') {
                    brackets.p++;
                } else if (arrayPatternArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;
                }
                subObjectPattern.push(arrayPatternArr[i]);
            }
            tmpElement = parseObjectPattern(subObjectPattern);
        } else {
            if (arrayPatternArr[i].type === 'COMMA') {
                tmpElement = null;
                i--;
            } else {
                tmpElement = {
                    type: 'Identifier',
                    name: arrayPatternArr[i].value
                }
            }
        }
        i++;
        if (i < arrayPatternArr.length && arrayPatternArr[i].type === 'ASSIGN') {
            element = {
                type: 'AssignmentPattern',
                left: tmpElement,
                right: null
            }
            var exp = [];
            var brackets = {
                c: 0,
                b: 0,
                p: 0
            }
            for (i = i + 1; i < arrayPatternArr.length; i++) {
                if (arrayPatternArr[i].type === 'LC') {
                    brackets.c++;
                } else if (arrayPatternArr[i].type === 'RC') {
                    brackets.c--;
                } else if (arrayPatternArr[i].type === 'LB') {
                    brackets.b++;
                } else if (arrayPatternArr[i].type === 'RB') {
                    brackets.b--;
                } else if (arrayPatternArr[i].type === 'LP') {
                    brackets.p++;
                } else if (arrayPatternArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (arrayPatternArr[i].type === 'COMMA' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;
                }
                exp.push(arrayPatternArr[i]);
            }
            element.right = parseExpression(exp);
        } else {
            element = tmpElement;
        }
        arrayPattern.elements.push(element);
        i++;
    }
    return arrayPattern;
}

//objectPatternArr不包含开头结尾的大括号
var parseObjectPattern = function (objectPatternArr) {
    var objectPattern = {
        type: 'ObjectPattern',
        properties: []
    }
    var i = 0;
    while (i < objectPatternArr.length) {
        var property = {}, tmpProperty = {};
        property = {
            type: 'Property',
            key: {
                type: 'Identifier',
                name: objectPatternArr[i].value
            },
            computed: false,
            value: {},
            kind: 'init',
            method: false,
            shorthand: true
        }
        tmpProperty = {
            type: 'Identifier',
            name: objectPatternArr[i].value
        }
        i++;
        if (i < objectPatternArr.length && objectPatternArr[i].type === 'ASSIGN') {
            var exp = [];
            var brackets = {
                c: 0,
                b: 0,
                p: 0
            }
            for (i = i + 1; i < objectPatternArr.length; i++) {
                if (objectPatternArr[i].type === 'LC') {
                    brackets.c++;
                } else if (objectPatternArr[i].type === 'RC') {
                    brackets.c--;
                } else if (objectPatternArr[i].type === 'LB') {
                    brackets.b++;
                } else if (objectPatternArr[i].type === 'RB') {
                    brackets.b--;
                } else if (objectPatternArr[i].type === 'LP') {
                    brackets.p++;
                } else if (objectPatternArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (objectPatternArr[i].type === 'COMMA' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;
                }
                exp.push(objectPatternArr[i]);
            }
            property.value = parseExpression(exp);
        } else {
            property.value = null;
        }
        objectPattern.properties.push(property);
        i++;
    }
    return objectPattern;
}

// blockStmtArr无两边大括号
var parseBlockStatement = function (blockStmtArr) {
    var blockStatement = {
        type: 'BlockStatement',
        body: []
    }

    var i = 0;
    while (i < blockStmtArr.length) {
        if (blockStmtArr[i].type === 'IMPORT') {
            var importDeclaration = [];
            while (blockStmtArr[i].type !== 'SEMI') {
                importDeclaration.push(blockStmtArr[i]);
                i++;
            }
            blockStatement.body.push(parseImportDeclaration(importDeclaration));
        } else if (blockStmtArr[i].type === 'FUNCTION') {
            var functionDeclaration = [];
            functionDeclaration.push(blockStmtArr[i]);  //function
            functionDeclaration.push(blockStmtArr[i + 1]);  //函数名
            functionDeclaration.push(blockStmtArr[i + 2]);  //(
            var brackets = {
                c: 0,
                b: 0,
                p: 1
            }
            for (i = i + 3; i < blockStmtArr.length; i++) {
                functionDeclaration.push(blockStmtArr[i]);
                if (blockStmtArr[i].type === 'LC') {
                    brackets.c++;
                } else if (blockStmtArr[i].type === 'RC') {
                    brackets.c--;
                } else if (blockStmtArr[i].type === 'LB') {
                    brackets.b++;
                } else if (blockStmtArr[i].type === 'RB') {
                    brackets.b--;
                } else if (blockStmtArr[i].type === 'LP') {
                    brackets.p++;
                } else if (blockStmtArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;  //当前i为)
                }
            }
            functionDeclaration.push(blockStmtArr[i + 1]); //{
            brackets = {
                c: 1,
                b: 0,
                p: 0
            }
            for (i = i + 2; i < blockStmtArr.length; i++) {
                functionDeclaration.push(blockStmtArr[i]);
                if (blockStmtArr[i].type === 'LC') {
                    brackets.c++;
                } else if (blockStmtArr[i].type === 'RC') {
                    brackets.c--;
                } else if (blockStmtArr[i].type === 'LB') {
                    brackets.b++;
                } else if (blockStmtArr[i].type === 'RB') {
                    brackets.b--;
                } else if (blockStmtArr[i].type === 'LP') {
                    brackets.p++;
                } else if (blockStmtArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;  //当前i为}
                }
            }
            blockStatement.body.push(parseFunctionDeclaration(functionDeclaration));
        } else if (blockStmtArr[i].type === 'VAR' || blockStmtArr[i].type === 'LET') {
            var variableDeclaration = [];
            while (blockStmtArr[i].type !== 'SEMI') {
                variableDeclaration.push(blockStmtArr[i]);
                i++;
            }
            blockStatement.body.push(parseVariableDeclaration(variableDeclaration));
        } else if (blockStmtArr[i].type === 'CLASS') {
            var classDeclaration = {
                type: 'ClassDeclaration',
                id: {
                    type: 'Identifier',
                    name: blockStmtArr[i + 1].value
                },
                superClass: null,
                body: {}
            }
            i = i + 2;  //是extends或{
            if (blockStmtArr[i].type === 'EXTENDS') {
                classDeclaration.superClass = {
                    type: 'Identifier',
                    name: tokens[i + 1].value
                }
                i = i + 2; //是{
            }
            i++;
            var brackets = {c: 1, b: 0, p: 0};
            var classBody = [];
            for (; i < blockStmtArr.length; i++) {
                if (blockStmtArr[i].type === 'LC') {
                    brackets.c++;
                } else if (blockStmtArr[i].type === 'RC') {
                    brackets.c--;
                } else if (blockStmtArr[i].type === 'LB') {
                    brackets.b++;
                } else if (blockStmtArr[i].type === 'RB') {
                    brackets.b--;
                } else if (blockStmtArr[i].type === 'LP') {
                    brackets.p++;
                } else if (blockStmtArr[i].type === 'RP') {
                    brackets.p--;
                }
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;
                }
                classBody.push(blockStmtArr[i]);
            }
            classDeclaration.body = parseClassBody(classBody);
            blockStatement.body.push(classDeclaration);
        } else {  // Statement
            if (blockStmtArr[i].type === 'WHILE') {
                var test = [];
                var brackets = {
                    c: 0,
                    b: 0,
                    p: 1
                };
                for (i = i + 2; i < blockStmtArr.length; i++) {
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    test.push(blockStmtArr[i]);
                }
                var body = [];
                brackets = {
                    c: 1,
                    b: 0,
                    p: 0
                };
                for (i = i + 2; i < blockStmtArr.length; i++) {
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    body.push(blockStmtArr[i]);
                }
                var stmt = {
                    type: 'WhileStatement',
                    test: parseExpression(test),
                    body: parseBlockStatement(body)
                };
                blockStatement.body.push(stmt);
            } else if (blockStmtArr[i].type === 'DO') {
                var body = [];
                var brackets = {
                    c: 1,
                    b: 0,
                    p: 0
                };
                for (i = i + 2; i < blockStmtArr.length; i++) {
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    body.push(blockStmtArr[i]);
                }
                var test = [];
                brackets = {
                    c: 0,
                    b: 0,
                    p: 1
                };
                for (i = i + 2; i < blockStmtArr.length; i++) {
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    test.push(blockStmtArr[i]);
                }
                var stmt = {
                    type: 'DoWhileStatement',
                    test: parseExpression(test),
                    body: parseBlockStatement(body)
                };
                blockStatement.body.push(stmt);
            } else if (blockStmtArr[i].type === 'IF') {
                var test = [];
                var brackets = {
                    c: 0,
                    b: 0,
                    p: 1
                };
                for (i = i + 2; i < blockStmtArr.length; i++) {
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    test.push(blockStmtArr[i]);
                }
                var consequent = [];
                brackets = {
                    c: 1,
                    b: 0,
                    p: 0
                };
                for (i = i + 2; i < blockStmtArr.length; i++) {
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    consequent.push(blockStmtArr[i]);
                }
                //解析alternate
                var alternate = [];
                while (i < blockStmtArr.length - 1 && blockStmtArr[i + 1].type === 'ELSE') {
                    alternate.push(blockStmtArr[i + 1]);
                    i = i + 2;
                    if (blockStmtArr[i].type === 'IF') { //else if
                        alternate.push(blockStmtArr[i]);
                        brackets = {
                            c: 0,
                            b: 0,
                            p: 0
                        };
                        for (i = i + 1; i < blockStmtArr.length; i++) {
                            if (blockStmtArr[i].type === 'LC') {
                                brackets.c++;
                            } else if (blockStmtArr[i].type === 'RC') {
                                brackets.c--;
                            } else if (blockStmtArr[i].type === 'LB') {
                                brackets.b++;
                            } else if (blockStmtArr[i].type === 'RB') {
                                brackets.b--;
                            } else if (blockStmtArr[i].type === 'LP') {
                                brackets.p++;
                            } else if (blockStmtArr[i].type === 'RP') {
                                brackets.p--;
                            }
                            alternate.push(blockStmtArr[i]);
                            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                                break;
                            }
                        }
                        i++; //则i为{
                    }
                    brackets = {
                        c: 0,
                        b: 0,
                        p: 0
                    };
                    for (; i < blockStmtArr.length; i++) {
                        if (blockStmtArr[i].type === 'LC') {
                            brackets.c++;
                        } else if (blockStmtArr[i].type === 'RC') {
                            brackets.c--;
                        } else if (blockStmtArr[i].type === 'LB') {
                            brackets.b++;
                        } else if (blockStmtArr[i].type === 'RB') {
                            brackets.b--;
                        } else if (blockStmtArr[i].type === 'LP') {
                            brackets.p++;
                        } else if (blockStmtArr[i].type === 'RP') {
                            brackets.p--;
                        }
                        alternate.push(blockStmtArr[i]);
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break; //i为}
                        }
                    }
                }
                var stmt = {
                    type: 'IfStatement',
                    test: parseExpression(test),
                    consequent: parseBlockStatement(consequent),
                    alternate: parseIfAlternate(alternate)
                }
                blockStatement.body.push(stmt);
            } else if (blockStmtArr[i].type === 'FOR') {
                //ForStatement ForOfStatement ForInStatement
                var condition = [];
                var brackets = {
                    c: 0,
                    b: 0,
                    p: 1
                };
                for (i = i + 2; i < blockStmtArr.length; i++) {
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    condition.push(blockStmtArr[i]);
                }
                var stmt = parseForCondition(condition);
                var body = [];
                brackets = {
                    c: 1,
                    b: 0,
                    p: 0
                };
                for (i = i + 2; i < blockStmtArr.length; i++) {
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    body.push(blockStmtArr[i]);
                }
                stmt.body = parseBlockStatement(body);
                blockStatement.body.push(stmt);
            } else if (blockStmtArr[i].type === 'LC') {
                var blockStmt = [];
                var brackets = {
                    c: 1,
                    b: 0,
                    p: 0
                };
                for (i = i + 1; i < blockStmtArr.length; i++) {
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    blockStmt.push(blockStmtArr[i]);
                }
                blockStatement.body.push(parseBlockStatement(blockStmt));
            } else {
                var stmt = [];
                var brackets = {
                    c: 0,
                    b: 0,
                    p: 0
                };
                for (; i < blockStmtArr.length; i++) {
                    stmt.push(blockStmtArr[i]);
                    if (blockStmtArr[i].type === 'LC') {
                        brackets.c++;
                    } else if (blockStmtArr[i].type === 'RC') {
                        brackets.c--;
                    } else if (blockStmtArr[i].type === 'LB') {
                        brackets.b++;
                    } else if (blockStmtArr[i].type === 'RB') {
                        brackets.b--;
                    } else if (blockStmtArr[i].type === 'LP') {
                        brackets.p++;
                    } else if (blockStmtArr[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (blockStmtArr[i].type === 'SEMI' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                }
                blockStatement.body.push(parseStatement(stmt));
            }
        }
        i++; // 每次返回的i停在SEMI，然后++
    }
    return blockStatement;
}

// 只处理分号结尾的statement，stmtArr包含最后的分号
var parseStatement = function (stmtArr) {
    var stmt = {};
    if (stmtArr[0].type === 'RETURN') {
        stmtArr.pop();
        stmtArr.shift(); //去掉开头结尾的return和分号
        stmt = {
            type: 'ReturnStatement',
            argument: parseExpression(stmtArr)
        }
    } else if (stmtArr[0].type === 'BREAK') {
        stmt = {
            type: 'BreakStatement',
            label: null
        }
    } else if (stmtArr[0].type === 'CONTINUE') {
        stmt = {
            type: 'ContinueStatement',
            label: null
        }
    } else {
        stmtArr.pop();  //去掉末尾的分号
        stmt = {
            type: 'ExpressionStatement',
            expression: parseExpression(stmtArr)
        }
    }
    return stmt;
}

// conditionArr不包含头尾小括号，返回for语句的stmt对象，body为{}
var parseForCondition = function (conditionArr) {
    var forStmt = {};
    var flag = '';
    for (var item of conditionArr) {
        if (item.type === 'SEMI' || item.type === 'OF' || item.type === 'IN') {
            flag = item.type;
            break;
        }
    }
    if (flag === 'SEMI') {
        forStmt = {
            type: 'ForStatement',
            init: null,
            test: null,
            update: null,
            body: {}
        }
        var i = 0;
        var init = [];
        for (; i < conditionArr.length; i++) {
            if (conditionArr[i].type === 'SEMI') {
                break; //init解析完成
            }
            init.push(conditionArr[i]);
        }
        if (init.length > 0) {
            if (init[0].type === 'VAR' || init[0].type === 'LET') {
                forStmt.init = parseVariableDeclaration(init);
            } else {
                forStmt.init = parseExpression(init);
            }
        }
        var test = [];
        for (i = i + 1; i < conditionArr.length; i++) {
            if (conditionArr[i].type === 'SEMI') {
                break; //test解析完成
            }
            test.push(conditionArr[i]);
        }
        if (test.length > 0) {
            forStmt.test = parseExpression(test);
        }
        var update = [];
        for (i = i + 1; i < conditionArr.length; i++) {
            update.push(conditionArr[i]);
        }
        if (update.length > 0) {
            forStmt.update = parseExpression(update);
        }
    } else if (flag === 'OF') {
        var left = [];
        var i = 0;
        var brackets = {
            c: 0,
            b: 0,
            p: 0
        };
        for (; i < conditionArr.length; i++) {
            if (conditionArr[i].type === 'LC') {
                brackets.c++;
            } else if (conditionArr[i].type === 'RC') {
                brackets.c--;
            } else if (conditionArr[i].type === 'LB') {
                brackets.b++;
            } else if (conditionArr[i].type === 'RB') {
                brackets.b--;
            } else if (conditionArr[i].type === 'LP') {
                brackets.p++;
            } else if (conditionArr[i].type === 'RP') {
                brackets.p--;
            }
            if (conditionArr[i].type === 'OF' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;  //left解析完毕
            }
            left.push(conditionArr[i]);
        }
        var right = [];
        brackets = {
            c: 0,
            b: 0,
            p: 0
        };
        for (i = i + 1; i < conditionArr.length; i++) {
            if (conditionArr[i].type === 'LC') {
                brackets.c++;
            } else if (conditionArr[i].type === 'RC') {
                brackets.c--;
            } else if (conditionArr[i].type === 'LB') {
                brackets.b++;
            } else if (conditionArr[i].type === 'RB') {
                brackets.b--;
            } else if (conditionArr[i].type === 'LP') {
                brackets.p++;
            } else if (conditionArr[i].type === 'RP') {
                brackets.p--;
            }
            right.push(conditionArr[i]);
        }
        forStmt = {
            type: 'ForOfStatement',
            left: left[0].type === 'VAR' || left[0].type === 'LET' ? parseVariableDeclaration(left) : parseExpression(left),
            right: parseExpression(right),
            body: {}
        }
    } else if (flag === 'IN') {
        var left = [];
        var i = 0;
        var brackets = {
            c: 0,
            b: 0,
            p: 0
        };
        for (; i < conditionArr.length; i++) {
            if (conditionArr[i].type === 'LC') {
                brackets.c++;
            } else if (conditionArr[i].type === 'RC') {
                brackets.c--;
            } else if (conditionArr[i].type === 'LB') {
                brackets.b++;
            } else if (conditionArr[i].type === 'RB') {
                brackets.b--;
            } else if (conditionArr[i].type === 'LP') {
                brackets.p++;
            } else if (conditionArr[i].type === 'RP') {
                brackets.p--;
            }
            if (conditionArr[i].type === 'IN' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;  //left解析完毕
            }
            left.push(conditionArr[i]);
        }
        var right = [];
        brackets = {
            c: 0,
            b: 0,
            p: 0
        };
        for (i = i + 1; i < conditionArr.length; i++) {
            if (conditionArr[i].type === 'LC') {
                brackets.c++;
            } else if (conditionArr[i].type === 'RC') {
                brackets.c--;
            } else if (conditionArr[i].type === 'LB') {
                brackets.b++;
            } else if (conditionArr[i].type === 'RB') {
                brackets.b--;
            } else if (conditionArr[i].type === 'LP') {
                brackets.p++;
            } else if (conditionArr[i].type === 'RP') {
                brackets.p--;
            }
            right.push(conditionArr[i]);
        }
        forStmt = {
            type: 'ForInStatement',
            left: left[0].type === 'VAR' || left[0].type === 'LET' ? parseVariableDeclaration(left) : parseExpression(left),
            right: parseExpression(right),
            body: {},
            each: false
        }
    }
    return forStmt;
}

// alternateArr为空即无else，不为空则包含开头的ELSE
var parseIfAlternate = function (alternateArr) {
    if (alternateArr.length === 0) {
        return null
    }
    if (alternateArr[1].type === 'IF') {
        var test = [];
        var brackets = {
            c: 0,
            b: 0,
            p: 1
        };
        var i = 3;
        for (; i < alternateArr.length; i++) {
            if (alternateArr[i].type === 'LC') {
                brackets.c++;
            } else if (alternateArr[i].type === 'RC') {
                brackets.c--;
            } else if (alternateArr[i].type === 'LB') {
                brackets.b++;
            } else if (alternateArr[i].type === 'RB') {
                brackets.b--;
            } else if (alternateArr[i].type === 'LP') {
                brackets.p++;
            } else if (alternateArr[i].type === 'RP') {
                brackets.p--;
            }
            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;
            }
            test.push(alternateArr[i]);
        }
        //当前i为)
        var consequent = [];
        brackets = {
            c: 1,
            b: 0,
            p: 0
        };
        for (i = i + 2; i < alternateArr.length; i++) {
            if (alternateArr[i].type === 'LC') {
                brackets.c++;
            } else if (alternateArr[i].type === 'RC') {
                brackets.c--;
            } else if (alternateArr[i].type === 'LB') {
                brackets.b++;
            } else if (alternateArr[i].type === 'RB') {
                brackets.b--;
            } else if (alternateArr[i].type === 'LP') {
                brackets.p++;
            } else if (alternateArr[i].type === 'RP') {
                brackets.p--;
            }
            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;
            }
            consequent.push(alternateArr[i]);
        }
        //当前i为}
        var alternate = {
            type: 'IfStatement',
            test: parseExpression(test),
            consequent: parseBlockStatement(consequent),
            alternate: parseIfAlternate(alternateArr.slice(i + 1))
        }
        return alternate;
    } else {
        alternateArr.shift();
        alternateArr.shift();
        alternateArr.pop();
        var alternate = parseBlockStatement(alternateArr);
        return alternate;
    }
}

//classBodyArr不包含两端{}
var parseClassBody = function (classBodyArr) {
    var classBody = {
        type: 'ClassBody',
        body: []
    }
    var i = 0;
    var brackets = {c: 0, b: 0, p: 0};
    while (i < classBodyArr.length) {
        var methodDefinition = {
            type: 'MethodDefinition',
            key: {},
            computed: false,
            value: {},
            kind: 'method',
            static: false
        }
        if (classBodyArr[i].type === 'STATIC') {
            methodDefinition.static = true;
            i++;
        }
        methodDefinition.key = {
            type: 'Identifier',
            name: classBodyArr[i].value
        }
        var methodName = classBodyArr[i].value;
        if (classBodyArr[i].value === 'constructor') {
            methodDefinition.kind = 'constructor';
        }
        var method = [];
        i++;//当前i为(
        brackets = {c: 0, b: 0, p: 0};
        for (; i < classBodyArr.length; i++) {
            method.push(classBodyArr[i]);
            if (classBodyArr[i].type === 'LC') {
                brackets.c++;
            } else if (classBodyArr[i].type === 'RC') {
                brackets.c--;
            } else if (classBodyArr[i].type === 'LB') {
                brackets.b++;
            } else if (classBodyArr[i].type === 'RB') {
                brackets.b--;
            } else if (classBodyArr[i].type === 'LP') {
                brackets.p++;
            } else if (classBodyArr[i].type === 'RP') {
                brackets.p--;
            }
            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;  //当前i为)
            }
        }
        for (i = i + 1; i < classBodyArr.length; i++) {
            method.push(classBodyArr[i]);
            if (classBodyArr[i].type === 'LC') {
                brackets.c++;
            } else if (classBodyArr[i].type === 'RC') {
                brackets.c--;
            } else if (classBodyArr[i].type === 'LB') {
                brackets.b++;
            } else if (classBodyArr[i].type === 'RB') {
                brackets.b--;
            } else if (classBodyArr[i].type === 'LP') {
                brackets.p++;
            } else if (classBodyArr[i].type === 'RP') {
                brackets.p--;
            }
            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                break;  //当前i为}
            }
        }
        i++;
        method.unshift({
            type: 'FUNCTION',
            value: 'function'
        })
        methodDefinition.value = parseFunctionExpression(method);
        methodDefinition.value.id = methodName;
        classBody.body.push(methodDefinition);
    }
    return classBody;
}

exports.constructTree = function (tokens) {
    return new Promise((resolve) => {
        var top = {
            type: 'Program',
            body: [],
            sourceType: 'script',
        };

        var i = 0;
        var exportStatus = null;
        while (i < tokens.length) {
            if (tokens[i].type === 'IMPORT') {
                var importDeclaration = [];
                while (tokens[i].type !== 'SEMI') {
                    importDeclaration.push(tokens[i]);
                    i++;
                }
                top.body.push(parseImportDeclaration(importDeclaration));
            } else if (tokens[i].type === 'FUNCTION') {
                var functionDeclaration = [];
                functionDeclaration.push(tokens[i]);  //function
                functionDeclaration.push(tokens[i + 1]);  //函数名
                functionDeclaration.push(tokens[i + 2]);  //(
                var brackets = {
                    c: 0,
                    b: 0,
                    p: 1
                }
                for (i = i + 3; i < tokens.length; i++) {
                    functionDeclaration.push(tokens[i]);
                    if (tokens[i].type === 'LC') {
                        brackets.c++;
                    } else if (tokens[i].type === 'RC') {
                        brackets.c--;
                    } else if (tokens[i].type === 'LB') {
                        brackets.b++;
                    } else if (tokens[i].type === 'RB') {
                        brackets.b--;
                    } else if (tokens[i].type === 'LP') {
                        brackets.p++;
                    } else if (tokens[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;  //当前i为)
                    }
                }
                functionDeclaration.push(tokens[i + 1]); //{
                brackets = {
                    c: 1,
                    b: 0,
                    p: 0
                }
                for (i = i + 2; i < tokens.length; i++) {
                    functionDeclaration.push(tokens[i]);
                    if (tokens[i].type === 'LC') {
                        brackets.c++;
                    } else if (tokens[i].type === 'RC') {
                        brackets.c--;
                    } else if (tokens[i].type === 'LB') {
                        brackets.b++;
                    } else if (tokens[i].type === 'RB') {
                        brackets.b--;
                    } else if (tokens[i].type === 'LP') {
                        brackets.p++;
                    } else if (tokens[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;  //当前i为}
                    }
                }
                var funcDec = parseFunctionDeclaration(functionDeclaration);
                if (exportStatus === null) {
                    top.body.push(funcDec);
                } else if (exportStatus === 'ExportDefaultDeclaration') {
                    top.body.push({
                        type: 'ExportDefaultDeclaration',
                        declaration: funcDec
                    });
                    exportStatus = null;
                } else if (exportStatus === 'ExportNamedDeclaration') {
                    top.body.push({
                        type: 'ExportNamedDeclaration',
                        declaration: funcDec,
                        specifiers: [],
                        source: null
                    });
                    exportStatus = null;
                }
            } else if (tokens[i].type === 'VAR' || tokens[i].type === 'LET') {
                var variableDeclaration = [];
                var brackets = {c: 0, b: 0, p: 0};
                while (tokens[i].type !== 'SEMI' || brackets.c !== 0 || brackets.b !== 0 || brackets.p !== 0) {
                    if (tokens[i].type === 'LC') {
                        brackets.c++;
                    } else if (tokens[i].type === 'RC') {
                        brackets.c--;
                    } else if (tokens[i].type === 'LB') {
                        brackets.b++;
                    } else if (tokens[i].type === 'RB') {
                        brackets.b--;
                    } else if (tokens[i].type === 'LP') {
                        brackets.p++;
                    } else if (tokens[i].type === 'RP') {
                        brackets.p--;
                    }
                    variableDeclaration.push(tokens[i]);
                    i++;
                }
                var varDec = parseVariableDeclaration(variableDeclaration);
                if (exportStatus === null) {
                    top.body.push(varDec);
                } else if (exportStatus === 'ExportNamedDeclaration') {
                    top.body.push({
                        type: 'ExportNamedDeclaration',
                        declaration: varDec,
                        specifiers: [],
                        source: null
                    });
                    exportStatus = null;
                }
            } else if (tokens[i].type === 'EXPORT') {
                sourceType = 'module';
                if (tokens[i + 1].type === 'DEFAULT') {
                    exportStatus = 'ExportDefaultDeclaration';
                    i++;
                } else {
                    exportStatus = 'ExportNamedDeclaration';
                }
            } else if (tokens[i].type === 'CLASS') {
                var classDeclaration = {
                    type: 'ClassDeclaration',
                    id: {
                        type: 'Identifier',
                        name: tokens[i + 1].value
                    },
                    superClass: null,
                    body: {}
                }
                i = i + 2;  //是extends或{
                if (tokens[i].type === 'EXTENDS') {
                    classDeclaration.superClass = {
                        type: 'Identifier',
                        name: tokens[i + 1].value
                    }
                    i = i + 2; //是{
                }
                i++;
                var brackets = {c: 1, b: 0, p: 0};
                var classBody = [];
                for (; i < tokens.length; i++) {
                    if (tokens[i].type === 'LC') {
                        brackets.c++;
                    } else if (tokens[i].type === 'RC') {
                        brackets.c--;
                    } else if (tokens[i].type === 'LB') {
                        brackets.b++;
                    } else if (tokens[i].type === 'RB') {
                        brackets.b--;
                    } else if (tokens[i].type === 'LP') {
                        brackets.p++;
                    } else if (tokens[i].type === 'RP') {
                        brackets.p--;
                    }
                    if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                        break;
                    }
                    classBody.push(tokens[i]);
                }
                classDeclaration.body = parseClassBody(classBody);
                top.body.push(classDeclaration);
            } else {  // Statement
                if (tokens[i].type === 'WHILE') {
                    var test = [];
                    var brackets = {
                        c: 0,
                        b: 0,
                        p: 1
                    };
                    for (i = i + 2; i < tokens.length; i++) {
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        test.push(tokens[i]);
                    }
                    var body = [];
                    brackets = {
                        c: 1,
                        b: 0,
                        p: 0
                    };
                    for (i = i + 2; i < tokens.length; i++) {
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        body.push(tokens[i]);
                    }
                    var stmt = {
                        type: 'WhileStatement',
                        test: parseExpression(test),
                        body: parseBlockStatement(body)
                    };
                    top.body.push(stmt);
                } else if (tokens[i].type === 'DO') {
                    var body = [];
                    var brackets = {
                        c: 1,
                        b: 0,
                        p: 0
                    };
                    for (i = i + 2; i < tokens.length; i++) {
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        body.push(tokens[i]);
                    }
                    var test = [];
                    brackets = {
                        c: 0,
                        b: 0,
                        p: 1
                    };
                    for (i = i + 2; i < tokens.length; i++) {
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        test.push(tokens[i]);
                    }
                    var stmt = {
                        type: 'DoWhileStatement',
                        test: parseExpression(test),
                        body: parseBlockStatement(body)
                    };
                    top.body.push(stmt);
                } else if (tokens[i].type === 'IF') {
                    var test = [];
                    var brackets = {
                        c: 0,
                        b: 0,
                        p: 1
                    };
                    for (i = i + 2; i < tokens.length; i++) {
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        test.push(tokens[i]);
                    }
                    var consequent = [];
                    brackets = {
                        c: 1,
                        b: 0,
                        p: 0
                    };
                    for (i = i + 2; i < tokens.length; i++) {
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        consequent.push(tokens[i]);
                    }
                    //解析alternate
                    var alternate = [];
                    while (i < tokens.length - 1 && tokens[i + 1].type === 'ELSE') {
                        alternate.push(tokens[i + 1]);
                        i = i + 2;
                        if (tokens[i].type === 'IF') { //else if
                            alternate.push(tokens[i]);
                            brackets = {
                                c: 0,
                                b: 0,
                                p: 0
                            };
                            for (i = i + 1; i < tokens.length; i++) {
                                if (tokens[i].type === 'LC') {
                                    brackets.c++;
                                } else if (tokens[i].type === 'RC') {
                                    brackets.c--;
                                } else if (tokens[i].type === 'LB') {
                                    brackets.b++;
                                } else if (tokens[i].type === 'RB') {
                                    brackets.b--;
                                } else if (tokens[i].type === 'LP') {
                                    brackets.p++;
                                } else if (tokens[i].type === 'RP') {
                                    brackets.p--;
                                }
                                alternate.push(tokens[i]);
                                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                                    break;
                                }
                            }
                            i++; //则i为{
                        }
                        brackets = {
                            c: 0,
                            b: 0,
                            p: 0
                        };
                        for (; i < tokens.length; i++) {
                            if (tokens[i].type === 'LC') {
                                brackets.c++;
                            } else if (tokens[i].type === 'RC') {
                                brackets.c--;
                            } else if (tokens[i].type === 'LB') {
                                brackets.b++;
                            } else if (tokens[i].type === 'RB') {
                                brackets.b--;
                            } else if (tokens[i].type === 'LP') {
                                brackets.p++;
                            } else if (tokens[i].type === 'RP') {
                                brackets.p--;
                            }
                            alternate.push(tokens[i]);
                            if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                                break; //i为}
                            }
                        }
                    }
                    var stmt = {
                        type: 'IfStatement',
                        test: parseExpression(test),
                        consequent: parseBlockStatement(consequent),
                        alternate: parseIfAlternate(alternate)
                    }
                    top.body.push(stmt);
                } else if (tokens[i].type === 'FOR') {
                    //ForStatement ForOfStatement ForInStatement
                    var condition = [];
                    var brackets = {
                        c: 0,
                        b: 0,
                        p: 1
                    };
                    for (i = i + 2; i < tokens.length; i++) {
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        condition.push(tokens[i]);
                    }
                    var stmt = parseForCondition(condition);
                    var body = [];
                    brackets = {
                        c: 1,
                        b: 0,
                        p: 0
                    };
                    for (i = i + 2; i < tokens.length; i++) {
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        body.push(tokens[i]);
                    }
                    stmt.body = parseBlockStatement(body);
                    top.body.push(stmt);
                } else if (tokens[i].type === 'LC') {
                    var blockStmt = [];
                    var brackets = {
                        c: 1,
                        b: 0,
                        p: 0
                    };
                    for (i = i + 1; i < tokens.length; i++) {
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        blockStmt.push(tokens[i]);
                    }
                    top.body.push(parseBlockStatement(blockStmt));
                } else {
                    var stmt = [];
                    var brackets = {
                        c: 0,
                        b: 0,
                        p: 0
                    };
                    for (; i < tokens.length; i++) {
                        stmt.push(tokens[i]);
                        if (tokens[i].type === 'LC') {
                            brackets.c++;
                        } else if (tokens[i].type === 'RC') {
                            brackets.c--;
                        } else if (tokens[i].type === 'LB') {
                            brackets.b++;
                        } else if (tokens[i].type === 'RB') {
                            brackets.b--;
                        } else if (tokens[i].type === 'LP') {
                            brackets.p++;
                        } else if (tokens[i].type === 'RP') {
                            brackets.p--;
                        }
                        if (tokens[i].type === 'SEMI' && brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                    }
                    var statement = parseStatement(stmt);
                    if (exportStatus === null) {
                        top.body.push(statement);
                    } else if (exportStatus === 'ExportDefaultDeclaration') {
                        top.body.push({
                            type: 'ExportDefaultDeclaration',
                            declaration: statement.expression
                        });
                        exportStatus = null;
                    }
                }
            }
            i++; // 每次返回的i停在SEMI，然后++
        }

        top.sourceType = sourceType;

        resolve(top)

        /* 输出文法分析结果，保存在dest/tree.json */
        // fs.writeFile('./tree.json', JSON.stringify(top, null, 2), 'utf8', (err) => {
        //     if (err) throw err;
        //     // console.log('Got syntax tree!');
        //
        //     // return top;
        // });

    })
}