/**
 * 转换为es5 transform
 */

var fs = require('fs');

var symbolStack = [];
var preFunc = {
    _slicedToArray: {
        flag: false,
        code: "var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i[\"return\"]) _i[\"return\"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError(\"Invalid attempt to destructure non-iterable instance\"); } }; }();"
    },
    _defineProperty: {
        flag: false,
        code: "var _tmpObject;\nfunction _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }"
    },
    _classCallCheck: {
        flag: false,
        code: "function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError(\"Cannot call a class as a function\"); } }"
    },
    _possibleConstructorReturn: {
        flag: false,
        code: "function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError(\"this hasn't been initialised - super() hasn't been called\"); } return call && (typeof call === \"object\" || typeof call === \"function\") ? call : self; }"
    },
    _inherits: {
        flag: false,
        code: "function _inherits(subClass, superClass) { if (typeof superClass !== \"function\" && superClass !== null) { throw new TypeError(\"Super expression must either be null or a function, not \" + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }"
    },
    _createClass: {
        flag: false,
        code: "var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if (\"value\" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();"
    },
    _get: {
        flag: false,
        code: "var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if (\"value\" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };"
    },
    _toConsumableArray: {
        flag: false,
        code: "function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }"
    },
    defineProperty: {
        flag: false,
        code: "Object.defineProperty(exports, \"__esModule\", { value: true });"
    }
};
var classList = {};

var getSymbolName = function (name, ifLet = false) {
    if (ifLet && ifExistSymbol(name)) {
        var suffix = 1;
        while (ifExistSymbol("_" + name + suffix.toString())) {
            suffix++;
        }
        return "_" + name + suffix.toString();
    }
    return name;
}

var ifExistSymbol = function (name) {
    for (let i = symbolStack.length - 1; i >= 0; i--) {
        for (var key in symbolStack[i]) {
            if (key === name) {
                return true;
            }
        }
    }
    return false;
}

var transformImportDeclaration = function (importDeclarationLeaf) {
    return `var ${importDeclarationLeaf.specifiers[0].local.name} = require(${importDeclarationLeaf.source.raw});`;
}

var transformFunctionDeclaration = function (functionDeclarationLeaf) {
    var functionDeclaration = `function ${functionDeclarationLeaf.id.name}`;
    var params = [];
    var curSymbols = {};
    var count = 0;
    for (var paramLeaf of functionDeclarationLeaf.params) {
        if (paramLeaf.type === 'Identifier') {
            curSymbols[paramLeaf.name] = paramLeaf.name;
        } else if (paramLeaf.type === 'AssignmentPattern') {
            curSymbols[paramLeaf.left.name] = paramLeaf.left.name;
            break;
        } else if (paramLeaf.type === 'RestElement') {
            curSymbols[paramLeaf.argument.name] = paramLeaf.argument.name;
            break;
        }
        params.push(transformLeaf(paramLeaf));
        count++;
    }
    var pre = "";
    for (let i = count; i < functionDeclarationLeaf.params.length; i++) {
        if (functionDeclarationLeaf.params[i].type === 'Identifier') {
            curSymbols[functionDeclarationLeaf.params[i].name] = functionDeclarationLeaf.params[i].name;
            pre += `var ${functionDeclarationLeaf.params[i].name} = arguments[${i}];`;
        } else if (functionDeclarationLeaf.params[i].type === 'AssignmentPattern') {
            curSymbols[functionDeclarationLeaf.params[i].left.name] = functionDeclarationLeaf.params[i].left.name;
            pre += `var ${functionDeclarationLeaf.params[i].left.name} = arguments.length > ${i} && arguments[${i}] !== undefined ? arguments[${i}] : ${transformLeaf(functionDeclarationLeaf.params[i].right)};`;
        } else if (functionDeclarationLeaf.params[i].type === 'RestElement') {
            curSymbols[functionDeclarationLeaf.params[i].argument.name] = functionDeclarationLeaf.params[i].argument.name;
            pre += `for (var _len = arguments.length, ${functionDeclarationLeaf.params[i].argument.name} = Array(_len > ${i} ? _len - ${i} : 0), _key = ${i}; _key < _len; _key++) { ${functionDeclarationLeaf.params[i].argument.name}[_key - ${i}] = arguments[_key]; }`;
        }
    }
    functionDeclaration += `(${params.join(', ')}) `
    functionDeclaration += `${transformBlockStatement(functionDeclarationLeaf.body, curSymbols, pre)}`;
    if (functionDeclarationLeaf.async) {
        functionDeclaration = "async " + functionDeclaration;
    }
    return functionDeclaration;
}

var transformObjectPattern = function (objectPatternLeaf, ifLet) {
    var names = [], newName = "_";
    for (var property of objectPatternLeaf.id.properties) {
        symbolStack[symbolStack.length - 1][property.key.name] = getSymbolName(property.key.name, ifLet);
        names.push(property.key.name);
    }
    newName += names.join('$');
    var declarator = [];
    declarator.push(`${newName} = ${transformLeaf(objectPatternLeaf.init)}`);
    for (var property of objectPatternLeaf.id.properties) {
        if (property.value === null) {
            declarator.push(`${transformIdentifier(property.key)} = ${newName}.${transformIdentifier(property.key)}`);
        } else {
            declarator.push(`${newName}$${transformIdentifier(property.key)} = ${newName}.${transformIdentifier(property.key)}`);
            declarator.push(`${transformIdentifier(property.key)} = undefined ? ${transformLeaf(property.value)} : ${newName}$${transformIdentifier(property.key)}`);
        }
    }
    return declarator.join(', ')
}

var transformArrayPattern = function (arrayPatternLeaf, depth, ifLet) {
    if (depth > 0) {
        preFunc._slicedToArray.flag = true;
    }
    var declarator = `_ref${'$'.repeat(depth)} = ${transformLeaf(arrayPatternLeaf.init)}`;
    for (let i = 0; i < arrayPatternLeaf.id.elements.length; i++) {
        var element = arrayPatternLeaf.id.elements[i];
        if (element === null) continue;
        if (element.type === 'ObjectPattern') {
            declarator += `, _ref${'$'.repeat(depth + 1)} = _ref${'$'.repeat(depth)}[${i}]`;
            for (var property of element.properties) {
                symbolStack[symbolStack.length - 1][property.key.name] = getSymbolName(property.key.name, ifLet);
                if (property.value === null) {
                    declarator += `, ${transformIdentifier(property.key)} = _ref${'$'.repeat(depth + 1)}.${property.key.name}`;
                } else {
                    declarator += `, _ref${'$'.repeat(depth + 1)}$${property.key.name} = _ref${'$'.repeat(depth + 1)}.${property.key.name}`;
                    declarator += `, ${transformIdentifier(property.key)} = _ref${'$'.repeat(depth + 1)}$${property.key.name} === undefined ? ${transformLeaf(property.value)} : _ref${'$'.repeat(depth + 1)}$${property.key.name}`;
                }
            }
        } else if (element.type === 'ArrayPattern') {
            var tmpArrayPatternLeaf = {
                id: element,
                init: {
                    type: 'Identifier',
                    name: `_slicedToArray(_ref${'$'.repeat(depth)}[${i}], ${element.elements.length})`
                }
            }
            declarator += `, ${transformArrayPattern(tmpArrayPatternLeaf, depth + 1, ifLet)}`
        } else if (element.type === 'AssignmentPattern') {
            symbolStack[symbolStack.length - 1][element.left.name] = getSymbolName(element.left.name, ifLet);
            declarator += `, _ref${'$'.repeat(depth + 1)}${i}=_ref${'$'.repeat(depth)}[${i}]`;
            declarator += `, ${transformIdentifier(element.left)} = _ref${'$'.repeat(depth + 1)}${i} === undefined ? ${transformLeaf(element.right)} : _ref${'$'.repeat(depth + 1)}${i}`;
        } else {
            symbolStack[symbolStack.length - 1][element.name] = getSymbolName(element.name, ifLet);
            declarator += `, ${transformIdentifier(element)} = _ref${'$'.repeat(depth)}[${i}]`;
        }
    }
    return declarator;
}

var transformVariableDeclaration = function (variableDeclarationLeaf) {
    var variableDeclaration = "var ";
    var declarations = [];
    for (var declarationLeaf of variableDeclarationLeaf.declarations) {
        if (declarationLeaf.id.type === 'ObjectPattern') {
            declarations.push(transformObjectPattern(declarationLeaf, variableDeclarationLeaf.kind === 'let'));
        } else if (declarationLeaf.id.type === 'ArrayPattern') {
            declarations.push(transformArrayPattern(declarationLeaf, 0, variableDeclarationLeaf.kind === 'let'));
        } else {
            symbolStack[symbolStack.length - 1][declarationLeaf.id.name] = getSymbolName(declarationLeaf.id.name, variableDeclarationLeaf.kind === 'let');
            var curDec = transformLeaf(declarationLeaf.id);
            if (declarationLeaf.init !== null) {
                curDec += ` = ${transformLeaf(declarationLeaf.init)}`;
            }
            declarations.push(curDec);
        }
    }
    variableDeclaration += `${declarations.join(', ')};`;
    return variableDeclaration;
}

var transformExportDefaultDeclaration = function (exportDefaultDeclarationLeaf) {
    preFunc.defineProperty.flag = true;
    var exportDefaultDeclaration = "";
    if (exportDefaultDeclarationLeaf.declaration.type === 'FunctionDeclaration') {
        exportDefaultDeclaration += `exports.default = ${exportDefaultDeclarationLeaf.declaration.id.name};`;
        // sufExport.push(`default: ${exportDefaultDeclarationLeaf.declaration.id.name}`);
        exportDefaultDeclaration += transformLeaf(exportDefaultDeclarationLeaf.declaration);
    } else {
        exportDefaultDeclaration += `exports.default = ${transformLeaf(exportDefaultDeclarationLeaf.declaration)};`;
        // sufExport.push(`default: ${exportDefaultDeclarationLeaf.declaration.id.name}`);
    }
    return exportDefaultDeclaration;
}

var transformExportNamedDeclaration = function (exportNamedDeclarationLeaf) {
    preFunc.defineProperty.flag = true;
    var exportNamedDeclaration = "";
    if (exportNamedDeclarationLeaf.declaration.type === 'FunctionDeclaration') {
        exportNamedDeclaration += `exports.${exportNamedDeclarationLeaf.declaration.id.name} = ${exportNamedDeclarationLeaf.declaration.id.name};`;
        exportNamedDeclaration += transformLeaf(exportNamedDeclarationLeaf.declaration);
    } else {
        var exportList = [];
        for (var declarator of exportNamedDeclarationLeaf.declaration.declarations) {
            exportList.push(`${declarator.id.name} = exports.${declarator.id.name} = ${declarator.init === null ? 'undefined' : transformLeaf(declarator.init)}`);
        }
        exportNamedDeclaration = `var ${exportList.join(', ')};`;
    }
    return exportNamedDeclaration;
}

var transformClassDeclaration = function (classDeclarationLeaf) {
    preFunc._classCallCheck.flag = true;
    var className = transformLeaf(classDeclarationLeaf.id);
    classList[className] = 0;
    var ifExtend = classDeclarationLeaf.superClass !== null;

    //处理ClassBody
    var constructor = null, methods = [], staticMethods = [];
    for (var methodDefinition of classDeclarationLeaf.body.body) {
        if (methodDefinition.kind === 'constructor') {
            constructor = methodDefinition;
        } else if (methodDefinition.static) {
            staticMethods.push(methodDefinition);
        } else {
            methods.push(methodDefinition);
        }
    }

    var classDeclaration = `var ${className} = function `;

    //最简单的class，没继承没方法，可能有构造
    if (!ifExtend && methods.length === 0 && staticMethods.length === 0) {
        var pre = `_classCallCheck(this, ${className});`;
        var params = [];
        var curSymbols = {};
        if (constructor !== null) {  //构造参数
            var count = 0;
            for (var paramLeaf of constructor.value.params) {
                if (paramLeaf.type === 'Identifier') {
                    curSymbols[paramLeaf.name] = paramLeaf.name;
                } else if (paramLeaf.type === 'AssignmentPattern') {
                    curSymbols[paramLeaf.left.name] = paramLeaf.left.name;
                    break;
                } else if (paramLeaf.type === 'RestElement') {
                    curSymbols[paramLeaf.argument.name] = paramLeaf.argument.name;
                    break;
                }
                params.push(transformLeaf(paramLeaf));
                count++;
            }
            for (let i = count; i < constructor.value.params.length; i++) {
                if (constructor.value.params[i].type === 'Identifier') {
                    curSymbols[constructor.value.params[i].name] = constructor.value.params[i].name;
                    pre += `var ${constructor.value.params[i].name} = arguments[${i}];`;
                } else if (constructor.value.params[i].type === 'AssignmentPattern') {
                    curSymbols[constructor.value.params[i].left.name] = constructor.value.params[i].left.name;
                    pre += `var ${constructor.value.params[i].left.name} = arguments.length > ${i} && arguments[${i}] !== undefined ? arguments[${i}] : ${transformLeaf(constructor.value.params[i].right)};`;
                } else if (constructor.value.params[i].type === 'RestElement') {
                    curSymbols[constructor.value.params[i].argument.name] = constructor.value.params[i].argument.name;
                    pre += `for (var _len = arguments.length, ${constructor.value.params[i].argument.name} = Array(_len > ${i} ? _len - ${i} : 0), _key = ${i}; _key < _len; _key++) { ${constructor.value.params[i].argument.name}[_key - ${i}] = arguments[_key]; }`;
                }
            }
        }
        classDeclaration += `${className}(${params.join(', ')}) `

        if (constructor !== null) {  //构造方法
            classDeclaration += transformBlockStatement(constructor.value.body, curSymbols, pre)
        } else {
            classDeclaration += `{_classCallCheck(this, ${className});}`;
        }

        classDeclaration += ";";
        return classDeclaration;
    }

    var superName = "";
    if (ifExtend) {  //继承
        preFunc._possibleConstructorReturn.flag = true;
        preFunc._inherits.flag = true;
        superName = transformLeaf(classDeclarationLeaf.superClass);
        classList[superName] += 1;
        superName = `_${superName}${classList[superName]}`;
    }

    classDeclaration += `(${superName}) {`
    if (ifExtend) {
        classDeclaration += `_inherits(${className}, ${superName});`;
    }

    // 处理构造函数
    var constructorVal = transformFunctionExpression(constructor.value);
    constructorVal = constructorVal.replace('constructor', className);
    var i = 9 + className.length;
    var brackets = {c: 0, b: 0, p: 0};
    for (; i < constructorVal.length; i++) {
        if (constructorVal[i] === '{') {
            brackets.c++;
        } else if (constructorVal[i] === '}') {
            brackets.c--;
        } else if (constructorVal[i] === '[') {
            brackets.b++;
        } else if (constructorVal[i] === ']') {
            brackets.b--;
        } else if (constructorVal[i] === '(') {
            brackets.p++;
        } else if (constructorVal[i] === ')') {
            brackets.p--;
        }
        if (brackets.c === 1 && brackets.b === 0 && brackets.p === 0) {
            i++;
            break;
        }
    }
    constructorVal = constructorVal.slice(0, i) + `_classCallCheck(this, ${className});` + constructorVal.slice(i);
    if (ifExtend) {
        // 处理子类构造函数中的super
        var constructorValList = constructorVal.split('super(');
        constructorVal = "";
        while (constructorValList.length > 0) {
            constructorVal += constructorValList.shift();
            if (constructorValList.length === 0) break;
            var nextConstructorVal = constructorValList[0];
            brackets = {c: 0, b: 0, p: 1};
            i = 0;
            var params = "";
            for (; i < nextConstructorVal.length; i++) {
                if (nextConstructorVal[i] === '{') {
                    brackets.c++;
                } else if (nextConstructorVal[i] === '}') {
                    brackets.c--;
                } else if (nextConstructorVal[i] === '[') {
                    brackets.b++;
                } else if (nextConstructorVal[i] === ']') {
                    brackets.b--;
                } else if (nextConstructorVal[i] === '(') {
                    brackets.p++;
                } else if (nextConstructorVal[i] === ')') {
                    brackets.p--;
                }
                if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                    break;
                }
                params += nextConstructorVal[i];
            }
            if (params.length > 0) {
                constructorVal += `return _possibleConstructorReturn(this, (${className}.__proto__ || Object.getPrototypeOf(${className})).call(this, ${params}))`;
            } else {
                constructorVal += `return _possibleConstructorReturn(this, (${className}.__proto__ || Object.getPrototypeOf(${className})).call(this))`;
            }
            constructorValList[0] = nextConstructorVal.substring(i + 1);
        }
    }
    classDeclaration += constructorVal;

    // 处理_createClass
    preFunc._createClass.flag = true;
    classDeclaration += `_createClass(${className}`;
    if (methods.length > 0) {
        var methodList = [];
        for (var method of methods) {
            var funcVal = transformFunctionExpression(method.value);
            // 处理函数里的super
            var funcValList = funcVal.split('super.');
            funcVal = "";
            while (funcValList.length > 0) {
                funcVal += funcValList.shift();
                if (funcValList.length === 0) break;
                preFunc._get.flag = true;
                var nextFuncVal = funcValList[0];
                var property = "";
                var i = 0;
                for (; i < nextFuncVal.length; i++) {
                    if (/[_a-zA-Z0-9]/.test(nextFuncVal[i])) {
                        property += nextFuncVal[i];
                    } else {
                        break;
                    }
                }
                funcVal += `_get(${className}.prototype.__proto__ || Object.getPrototypeOf(${className}.prototype), '${property}', this)`;
                if (nextFuncVal[i] === '(') {
                    var brackets = {c: 0, b: 0, p: 1};
                    var params = "";
                    for (i = i + 1; i < nextFuncVal.length; i++) {
                        if (nextFuncVal[i] === '{') {
                            brackets.c++;
                        } else if (nextFuncVal[i] === '}') {
                            brackets.c--;
                        } else if (nextFuncVal[i] === '[') {
                            brackets.b++;
                        } else if (nextFuncVal[i] === ']') {
                            brackets.b--;
                        } else if (nextFuncVal[i] === '(') {
                            brackets.p++;
                        } else if (nextFuncVal[i] === ')') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        params += nextFuncVal[i];
                    }
                    if (params.length > 0) {
                        funcVal += `.call(this, ${params})`;
                    } else {
                        funcVal += ".call(this)";
                    }
                    i++;
                }
                funcValList[0] = nextFuncVal.substring(i);
            }
            methodList.push(`{key: '${method.key.name}', value: ${funcVal}}`);
        }
        classDeclaration += `, [${methodList.join(', ')}]`;
    }
    if (staticMethods.length > 0) {
        var staticMethodList = [];
        for (var staticMethod of staticMethods) {
            var funcVal = transformFunctionExpression(staticMethod.value);
            // 处理函数里的super
            var funcValList = funcVal.split('super.');
            funcVal = "";
            while (funcValList.length > 0) {
                funcVal += funcValList.shift();
                if (funcValList.length === 0) break;
                preFunc._get.flag = true;
                var nextFuncVal = funcValList[0];
                var property = "";
                var i = 0;
                for (; i < nextFuncVal.length; i++) {
                    if (/[_a-zA-Z0-9]/.test(nextFuncVal[i])) {
                        property += nextFuncVal[i];
                    } else {
                        break;
                    }
                }
                funcVal += `_get(${className}.prototype.__proto__ || Object.getPrototypeOf(${className}.prototype), '${property}', this)`;
                if (nextFuncVal[i] === '(') {
                    var brackets = {c: 0, b: 0, p: 1};
                    var params = "";
                    for (i = i + 1; i < nextFuncVal.length; i++) {
                        if (nextFuncVal[i] === '{') {
                            brackets.c++;
                        } else if (nextFuncVal[i] === '}') {
                            brackets.c--;
                        } else if (nextFuncVal[i] === '[') {
                            brackets.b++;
                        } else if (nextFuncVal[i] === ']') {
                            brackets.b--;
                        } else if (nextFuncVal[i] === '(') {
                            brackets.p++;
                        } else if (nextFuncVal[i] === ')') {
                            brackets.p--;
                        }
                        if (brackets.c === 0 && brackets.b === 0 && brackets.p === 0) {
                            break;
                        }
                        params += nextFuncVal[i];
                    }
                    if (params.length > 0) {
                        funcVal += `.call(this, ${params})`;
                    } else {
                        funcVal += ".call(this)";
                    }
                    i++;
                }
                funcValList[0] = nextFuncVal.substring(i);
            }
            staticMethodList.push(`{key: '${staticMethod.key.name}', value: ${funcVal}}`);
        }
        classDeclaration += `, [${staticMethodList.join(', ')}]`;
    }
    classDeclaration += ");";

    classDeclaration += `return ${className};}`;

    //结尾
    if (ifExtend || methods.length > 0 || staticMethods.length > 0) {
        classDeclaration += "(";
        if (classDeclarationLeaf.superClass !== null) {
            classDeclaration += transformLeaf(classDeclarationLeaf.superClass);
        }
        classDeclaration += ")";
    }
    return classDeclaration + ";";
}

var transformIdentifier = function (identifierLeaf) {
    for (let i = symbolStack.length - 1; i >= 0; i--) {
        for (var key in symbolStack[i]) {
            if (key === identifierLeaf.name) {
                return symbolStack[i][key];
            }
        }
    }
    return identifierLeaf.name;
}

/** ===========================================================================
 *                                  Statement
 *  =========================================================================== */

var transformExpressionStatement = function (expressionStatementLeaf) {
    return transformLeaf(expressionStatementLeaf.expression) + ";";
}

var transformReturnStatement = function (returnStatementLeaf) {
    return `return ${transformLeaf(returnStatementLeaf.argument)};`;
}

var transformBlockStatement = function (blockStatementLeaf, symbols, pre = '') {
    symbolStack.push(symbols);
    var body = [];
    for (var bodyLeaf of blockStatementLeaf.body) {
        body.push(transformLeaf(bodyLeaf));
    }
    symbolStack.pop()
    return `{ ${pre + body.join('')} }`;
}

var transformWhileStatement = function (whileStatementLeaf) {
    return `while (${transformLeaf(whileStatementLeaf.test)}) ${transformLeaf(whileStatementLeaf.body)}`;
}

var transformDoWhileStatement = function (doWhileStatementLeaf) {
    return `do ${transformLeaf(doWhileStatementLeaf.body)} while (${transformLeaf(doWhileStatementLeaf.test)})`;
}

var transformIfStatement = function (ifStatementLeaf) {
    var ifStatement = `if (${transformLeaf(ifStatementLeaf.test)}) ${transformLeaf(ifStatementLeaf.consequent)}`;
    if (ifStatementLeaf.alternate !== null) {
        ifStatement += ` else ${transformLeaf(ifStatementLeaf.alternate)}`;
    }
    return ifStatement;
}

var transformForStatement = function (forStatementLeaf) {
    var forStatement = "for (";
    var curSymbol = {};
    if (forStatementLeaf.init === null) {
        forStatement += "; ";
    } else if (forStatementLeaf.init.type === 'VariableDeclaration') {
        var declarations = [];
        for (var declarationLeaf of forStatementLeaf.init.declarations) {
            curSymbol[declarationLeaf.id.name] = getSymbolName(declarationLeaf.id.name, declarationLeaf.kind === 'let');
            var curDec = transformLeaf(declarationLeaf.id);
            if (declarationLeaf.init !== null) {
                curDec += ` = ${transformLeaf(declarationLeaf.init)}`;
            }
            declarations.push(curDec);
        }
        forStatement += `var ${declarations.join(', ')}; `;
    } else {
        forStatement += `${transformLeaf(forStatementLeaf.init)}; `;
    }
    forStatement += `${forStatementLeaf.test === null ? "" : transformLeaf(forStatementLeaf.test)}; `;
    forStatement += `${forStatementLeaf.update === null ? "" : transformLeaf(forStatementLeaf.update)}) `;
    if (forStatementLeaf.body.type === 'BlockStatement') {
        forStatement += transformBlockStatement(forStatementLeaf.body, curSymbol);
    } else {
        forStatement += transformLeaf(forStatementLeaf.body);
    }
    return forStatement;
}

var transformForOfStatement = function (forOfStatementLeaf) {
    var forOfStatement = "";
    if (forOfStatementLeaf.right.type === 'ArrayExpression') {
        var arrName = getSymbolName('_arr');
        symbolStack[symbolStack.length - 1]['_arr'] = arrName;
        forOfStatement = `var ${arrName} = ${transformLeaf(forOfStatementLeaf.right)};`;
        forOfStatement += `for (var _i = 0; _i < ${arrName}.length; _i++) `;
        var curSymbol = {_i: '_i'};
        if (forOfStatementLeaf.body.type === 'BlockStatement') {
            var left = forOfStatementLeaf.left;
            var pre = "";
            if (left.type === 'Identifier') {
                left = {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: left,
                    right: {
                        type: 'Identifier',
                        name: `${arrName}[_i]`
                    }
                }
                pre = `${transformLeaf(left)};`;
            } else {
                left.declarations[0].init = {
                    type: 'Identifier',
                    name: `${arrName}[_i]`
                }
                pre = transformLeaf(left);
                curSymbol[left.declarations[0].id.name] = left.declarations[0].id.name;
            }
            forOfStatement += transformBlockStatement(forOfStatementLeaf.body, curSymbol, pre);
        }
    } else {
        forOfStatement += "var _iteratorNormalCompletion = true;\nvar _didIteratorError = false;\nvar _iteratorError = undefined;\ntry {";
        forOfStatement += `for (var _iterator = ${transformLeaf(forOfStatementLeaf.right)}[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) `;
        var left = forOfStatementLeaf.left;
        var pre = "";
        var curSymbol = {};
        if (left.type === 'Identifier') {
            left = {
                type: 'AssignmentExpression',
                operator: '=',
                left: left,
                right: {
                    type: 'Identifier',
                    name: '_step.value'
                }
            }
            pre = `${transformLeaf(left)};`;
        } else {
            left.declarations[0].init = {
                type: 'Identifier',
                name: `_step.value`
            }
            pre = transformLeaf(left);
            curSymbol[left.declarations[0].id.name] = left.declarations[0].id.name;
        }
        forOfStatement += transformBlockStatement(forOfStatementLeaf.body, curSymbol, pre);
        forOfStatement += "} catch (err) { _didIteratorError = true;_iteratorError = err; } finally { try { if (!_iteratorNormalCompletion && _iterator.return) { _iterator.return(); } } finally { if (_didIteratorError) { throw _iteratorError; } } }";
    }
    return forOfStatement;
}

var transformForInStatement = function (forInStatementLeaf) {
    var left = transformLeaf(forInStatementLeaf.left);
    left = left.endsWith(';') ? left.substring(0, left.length - 1) : left;
    return `for(${left} in ${transformLeaf(forInStatementLeaf.right)}) ${transformLeaf(forInStatementLeaf.body)}`;
}

/** ===========================================================================
 *                                  Expression
 *  =========================================================================== */

var transformCallExpression = function (callExpressionLeaf) {
    var callExpression = callExpressionLeaf.type === 'NewExpression' ? "new " : "";
    callExpression += transformLeaf(callExpressionLeaf.callee);
    //处理参数
    var args = [];
    var count = 0;
    for (var argLeaf of callExpressionLeaf.arguments) {
        if (argLeaf.type === 'SpreadElement') {
            break;
        }
        args.push(transformLeaf(argLeaf));
        count++;
    }
    if (count < callExpressionLeaf.arguments.length) {
        preFunc._toConsumableArray.flag = true;
        var arguments = callExpressionLeaf.arguments;
        var concatList = [], curArg = [];
        for (let i = count; i < callExpressionLeaf.arguments.length; i++) {
            if (arguments[i].type === 'SpreadElement') {
                if (curArg.length > 0) {
                    concatList.push(`[${curArg.join(', ')}]`);
                    curArg = [];
                }
                concatList.push(`_toConsumableArray(${transformLeaf(arguments[i].argument)})`);
            } else {
                curArg.push(transformLeaf(arguments[i]));
            }
        }
        if (curArg.length > 0) {
            concatList.push(`[${curArg.join(', ')}]`);
        }
        callExpression += `.apply(undefined,[${args.join(', ')}].concat(${concatList.join(', ')}))`;
    } else {
        callExpression += `(${args.join(', ')})`;
    }
    return callExpression;
}

var transformMemberExpression = function (memberExpressionLeaf) {
    var memberExpression = transformLeaf(memberExpressionLeaf.object);
    if (memberExpressionLeaf.computed) {
        memberExpression += ("[" + transformLeaf(memberExpressionLeaf.property) + "]");
    } else {
        memberExpression += ("." + transformLeaf(memberExpressionLeaf.property));
    }
    return memberExpression;
}

var transformFunctionExpression = function (functionExpressionLeaf) {
    var functionExpression = "function ";
    var params = [];
    var curSymbols = {};
    var count = 0;
    for (var paramLeaf of functionExpressionLeaf.params) {
        if (paramLeaf.type === 'Identifier') {
            curSymbols[paramLeaf.name] = paramLeaf.name;
        } else if (paramLeaf.type === 'AssignmentPattern') {
            curSymbols[paramLeaf.left.name] = paramLeaf.left.name;
            break;
        } else if (paramLeaf.type === 'RestElement') {
            curSymbols[paramLeaf.argument.name] = paramLeaf.argument.name;
            break;
        }
        params.push(transformLeaf(paramLeaf));
        count++;
    }
    var pre = "";
    for (let i = count; i < functionExpressionLeaf.params.length; i++) {
        if (functionExpressionLeaf.params[i].type === 'Identifier') {
            curSymbols[functionExpressionLeaf.params[i].name] = functionExpressionLeaf.params[i].name;
            pre += `var ${functionExpressionLeaf.params[i].name} = arguments[${i}];`;
        } else if (functionExpressionLeaf.params[i].type === 'AssignmentPattern') {
            curSymbols[functionExpressionLeaf.params[i].left.name] = functionExpressionLeaf.params[i].left.name;
            pre += `var ${functionExpressionLeaf.params[i].left.name} = arguments.length > ${i} && arguments[${i}] !== undefined ? arguments[${i}] : ${transformLeaf(functionExpressionLeaf.params[i].right)};`;
        } else if (functionExpressionLeaf.params[i].type === 'RestElement') {
            curSymbols[functionExpressionLeaf.params[i].argument.name] = functionExpressionLeaf.params[i].argument.name;
            pre += `for (var _len = arguments.length, ${functionExpressionLeaf.params[i].argument.name} = Array(_len > ${i} ? _len - ${i} : 0), _key = ${i}; _key < _len; _key++) { ${functionExpressionLeaf.params[i].argument.name}[_key - ${i}] = arguments[_key]; }`;
        }
    }
    if (functionExpressionLeaf.id !== null) {
        functionExpression += functionExpressionLeaf.id;
    }
    functionExpression += `(${params.join(', ')}) `
    functionExpression += `${transformBlockStatement(functionExpressionLeaf.body, curSymbols, pre)}`;
    if (functionExpressionLeaf.async) {
        functionExpression = "async " + functionExpression;
    }
    return functionExpression;
}

var transformArrowFunctionExpression = function (arrowFunctionExpressionLeaf) {
    var arrowFunctionExpression = "function";
    var params = [];
    var curSymbols = {};
    var count = 0;
    for (var paramLeaf of arrowFunctionExpressionLeaf.params) {
        if (paramLeaf.type === 'Identifier') {
            curSymbols[paramLeaf.name] = paramLeaf.name;
        } else if (paramLeaf.type === 'AssignmentPattern') {
            curSymbols[paramLeaf.left.name] = paramLeaf.left.name;
            break;
        } else if (paramLeaf.type === 'RestElement') {
            curSymbols[paramLeaf.argument.name] = paramLeaf.argument.name;
            break;
        }
        params.push(transformLeaf(paramLeaf));
        count++;
    }
    var pre = "";
    for (let i = count; i < arrowFunctionExpressionLeaf.params.length; i++) {
        if (arrowFunctionExpressionLeaf.params[i].type === 'Identifier') {
            curSymbols[arrowFunctionExpressionLeaf.params[i].name] = arrowFunctionExpressionLeaf.params[i].name;
            pre += `var ${arrowFunctionExpressionLeaf.params[i].name} = arguments[${i}];`;
        } else if (arrowFunctionExpressionLeaf.params[i].type === 'AssignmentPattern') {
            curSymbols[arrowFunctionExpressionLeaf.params[i].left.name] = arrowFunctionExpressionLeaf.params[i].left.name;
            pre += `var ${arrowFunctionExpressionLeaf.params[i].left.name} = arguments.length > ${i} && arguments[${i}] !== undefined ? arguments[${i}] : ${transformLeaf(arrowFunctionExpressionLeaf.params[i].right)};`;
        } else if (arrowFunctionExpressionLeaf.params[i].type === 'RestElement') {
            curSymbols[arrowFunctionExpressionLeaf.params[i].argument.name] = arrowFunctionExpressionLeaf.params[i].argument.name;
            pre += `for (var _len = arguments.length, ${arrowFunctionExpressionLeaf.params[i].argument.name} = Array(_len > ${i} ? _len - ${i} : 0), _key = ${i}; _key < _len; _key++) { ${arrowFunctionExpressionLeaf.params[i].argument.name}[_key - ${i}] = arguments[_key]; }`;
        }
    }
    arrowFunctionExpression += `(${params.join(', ')}) `
    if (arrowFunctionExpressionLeaf.expression) {
        arrowFunctionExpression += `{ ${pre}return ${transformLeaf(arrowFunctionExpressionLeaf.body)}; }`;
    } else {
        arrowFunctionExpression += `${transformBlockStatement(arrowFunctionExpressionLeaf.body, curSymbols, pre)}`;
    }
    if (arrowFunctionExpressionLeaf.async) {
        arrowFunctionExpression = "async " + arrowFunctionExpression;
    }
    return arrowFunctionExpression;
}

var transformBinaryExpression = function (binaryExpressionLeaf) {
    return `${transformLeaf(binaryExpressionLeaf.left)} ${binaryExpressionLeaf.operator} ${transformLeaf(binaryExpressionLeaf.right)}`;
}

var transformUnaryExpression = function (unaryExpressionLeaf) {
    return unaryExpressionLeaf.operator + transformLeaf(unaryExpressionLeaf.argument);
}

var transformUpdateExpression = function (updateExpressionLeaf) {
    if (updateExpressionLeaf.prefix) {
        return updateExpressionLeaf.operator + transformLeaf(updateExpressionLeaf.argument);
    } else {
        return transformLeaf(updateExpressionLeaf.argument) + updateExpressionLeaf.operator;
    }
}

var transformSequenceExpression = function (sequenceExpressionLeaf) {
    var expressions = [];
    for (var expressionLeaf of sequenceExpressionLeaf.expressions) {
        expressions.push(transformLeaf(expressionLeaf));
    }
    return expressions.join(', ');
}

var transformAssignmentExpression = function (assignmentExpressionLeaf) {
    return `${transformLeaf(assignmentExpressionLeaf.left)} ${assignmentExpressionLeaf.operator} ${transformLeaf(assignmentExpressionLeaf.right)}`;
}

var transformConditionalExpression = function (conditionalExpressionLeaf) {
    return `${transformLeaf(conditionalExpressionLeaf.test)} ? ${transformLeaf(conditionalExpressionLeaf.consequent)} : ${transformLeaf(conditionalExpressionLeaf.alternate)}`;
}

var transformArrayExpression = function (arrayExpressionLeaf) {
    var elements = [];
    var concatArray = "";
    var count = 0;
    for (var elementLeaf of arrayExpressionLeaf.elements) {
        if (elementLeaf.type === 'SpreadElement') {
            break;
        }
        elements.push(transformLeaf(elementLeaf));
        count++;
    }
    if (count < arrayExpressionLeaf.elements.length) {
        var concatElements = [], curElements = [];
        for (let i = count; i < arrayExpressionLeaf.elements.length; i++) {
            if (arrayExpressionLeaf.elements[i].type === 'SpreadElement') {
                if (curElements.length > 0) {
                    concatElements.push(`[${curElements.join(', ')}]`)
                    curElements = [];
                }
                concatElements.push(arrayExpressionLeaf.elements[i].argument.name);
            } else {
                curElements.push(transformLeaf(arrayExpressionLeaf.elements[i]))
            }
        }
        if (curElements.length > 0) {
            concatElements.push(`[${curElements.join(', ')}]`)
        }
        concatArray = `.concat(${concatElements.join(', ')})`
    }
    return `[${elements.join(', ')}]${concatArray}`;
}

var transformObjectExpression = function (objectExpressionLeaf) {
    var objectExpression = "";
    var properties = [];
    var count = 0;
    for (var property of objectExpressionLeaf.properties) {
        if (property.computed) {
            break;
        }
        properties.push(transformLeaf(property));
        count++;
    }
    if (count < objectExpressionLeaf.properties.length) {
        preFunc._defineProperty.flag = true;
        var defineProperties = [];
        for (let i = count; i < objectExpressionLeaf.properties.length; i++) {
            if (objectExpressionLeaf.properties[i].computed) {
                defineProperties.push(`_defineProperty(_tmpObject, ${transformLeaf(objectExpressionLeaf.properties[i].key)}, ${transformLeaf(objectExpressionLeaf.properties[i].value)})`)
            } else {
                defineProperties.push(`_defineProperty(_tmpObject, '${transformLeaf(objectExpressionLeaf.properties[i].key)}', ${transformLeaf(objectExpressionLeaf.properties[i].value)})`)
            }
        }
        objectExpression = `(_tmpObject = {${properties.join(', ')}}, ${defineProperties.join(', ')}, _tmpObject)`
    } else {
        objectExpression = `{${properties.join(', ')}}`;
    }
    return objectExpression;
}

/** ===========================================================================
 *                                   Others
 *  =========================================================================== */

var transformTemplateLiteral = function (templateLiteralLeaf) {
    var templateLiteral = "";
    for (let i = 0; i < templateLiteralLeaf.quasis.length; i++) {
        templateLiteral += `'${templateLiteralLeaf.quasis[i].value.raw}'`;
        if (!templateLiteralLeaf.quasis[i].tail) {
            templateLiteral += ` + ${transformLeaf(templateLiteralLeaf.expressions[i])} + `;
        }
    }
    return templateLiteral;
}

var transformLeaf = function (item) {
    if (item.type === 'ImportDeclaration') {
        return transformImportDeclaration(item);
    }
    if (item.type === 'FunctionDeclaration') {
        return transformFunctionDeclaration(item);
    }
    if (item.type === 'VariableDeclaration') {
        return transformVariableDeclaration(item);
    }
    if (item.type === 'ClassDeclaration') {
        return transformClassDeclaration(item);
    }
    if (item.type === 'ExportDefaultDeclaration') {
        return transformExportDefaultDeclaration(item);
    }
    if (item.type === 'ExportNamedDeclaration') {
        return transformExportNamedDeclaration(item);
    }
    if (item.type === 'Identifier') {
        return transformIdentifier(item);
    }
    if (item.type === 'Literal') {
        return item.raw;
    }

    // Statement
    if (item.type === 'ExpressionStatement') {
        return transformExpressionStatement(item);
    }
    if (item.type === 'BreakStatement') {
        return "break;";
    }
    if (item.type === 'ContinueStatement') {
        return "continue;";
    }
    if (item.type === 'ReturnStatement') {
        return transformReturnStatement(item);
    }
    if (item.type === 'BlockStatement') {
        return transformBlockStatement(item, {});
    }
    if (item.type === 'WhileStatement') {
        return transformWhileStatement(item);
    }
    if (item.type === 'DoWhileStatement') {
        return transformDoWhileStatement(item);
    }
    if (item.type === 'IfStatement') {
        return transformIfStatement(item);
    }
    if (item.type === 'ForStatement') {
        return transformForStatement(item);
    }
    if (item.type === 'ForOfStatement') {
        return transformForOfStatement(item);
    }
    if (item.type === 'ForInStatement') {
        return transformForInStatement(item);
    }

    // Expression
    if (item.type === 'CallExpression' || item.type === 'NewExpression') {
        return transformCallExpression(item);
    }
    if (item.type === 'MemberExpression') {
        return transformMemberExpression(item);
    }
    if (item.type === 'ArrowFunctionExpression') {
        return transformArrowFunctionExpression(item);
    }
    if (item.type === 'BinaryExpression') {
        return transformBinaryExpression(item);
    }
    if (item.type === 'UnaryExpression') {
        return transformUnaryExpression(item);
    }
    if (item.type === 'UpdateExpression') {
        return transformUpdateExpression(item);
    }
    if (item.type === 'ThisExpression') {
        return "this";
    }
    if (item.type === 'SequenceExpression') {
        return transformSequenceExpression(item);
    }
    if (item.type === 'AssignmentExpression') {
        return transformAssignmentExpression(item);
    }
    if (item.type === 'ConditionalExpression') {
        return transformConditionalExpression(item);
    }
    if (item.type === 'FunctionExpression') {
        return transformFunctionExpression(item);
    }
    if (item.type === 'ArrayExpression') {
        return transformArrayExpression(item);
    }
    if (item.type === 'ObjectExpression') {
        return transformObjectExpression(item);
    }

    // Others
    if (item.type === 'Property') {
        return `${item.key.name}: ${transformLeaf(item.value)}`;
    }
    if (item.type === 'TemplateLiteral') {
        return transformTemplateLiteral(item);
    }
    if (item.type === 'AssignmentPattern') {
        return `${transformLeaf(item.left)} = ${transformLeaf(item.right)}`;
    }
    if (item.type === 'Super') {
        return 'super';
    }

}

var transformToES5 = function (top) {
    // console.log('top', top)
    var res = "";

    symbolStack.push({})
    for (var item of top.body) {
        var tmp = transformLeaf(item);
        res += (tmp + "\n");
    }
    symbolStack.pop()

    for (var func in preFunc) {
        if (preFunc[func].flag) {
            res = (preFunc[func].code + "\n\n") + res;
        }
    }
    res = '"use strict";\n\n' + res;

    return res;
}

exports.transformToES5 = transformToES5;