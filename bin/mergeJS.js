var lexical = require('./lexical');
var syntax = require('./syntax');

var fs = require('fs');

exports.merge = async function merge(syntaxTree, path) {
    var moduleCount = 0;
    for (var i = 0; i < syntaxTree.body.length; i++) {
        var statement = syntaxTree.body[i];
        if (statement.type === 'ImportDeclaration') {
            moduleCount++;
            var sourcePath = path + statement.source.value + '.js';
            var tokens = lexical.tokenize(sourcePath);  //分词
            var importTree = await syntax.constructTree(tokens);
            importTree.body.push({
                type: 'ReturnStatement',
                argument: {
                    type: 'Identifier',
                    name: 'exports'
                }
            })
            syntaxTree.body.splice(i, 1,
                {
                    type: 'VariableDeclaration',
                    declarations: [
                        {
                            type: 'VariableDeclarator',
                            id: {
                                type: 'Identifier',
                                name: `_MODULE${moduleCount}`
                            },
                            init: {
                                type: 'CallExpression',
                                callee: {
                                    type: 'FunctionExpression',
                                    id: null,
                                    params: [],
                                    body: {
                                        type: 'BlockStatement',
                                        body: importTree.body
                                    },
                                    generator: false,
                                    expression: false,
                                    async: false
                                },
                                arguments: []
                            }
                        }
                    ],
                    kind: 'var'
                },
                {
                    type: 'VariableDeclaration',
                    declarations: [
                        {
                            type: 'VariableDeclarator',
                            id: {
                                type: 'Identifier',
                                name: statement.specifiers[0].local.name
                            },
                            init: {
                                type: 'MemberExpression',
                                computed: false,
                                object: {
                                    type: 'Identifier',
                                    name: `_MODULE${moduleCount}`
                                },
                                property: {
                                    type: 'Identifier',
                                    name: statement.specifiers[0].type === 'ImportDefaultSpecifier' ? 'default' : statement.specifiers[0].imported.name
                                }
                            }
                        }
                    ],
                    kind: 'var'
                }
            );
            i++;
        }
    }
    // fs.writeFile('./tree.json', JSON.stringify(syntaxTree, null, 2), 'utf8', (err) => {
    //     if (err) throw err;
    // });
    return syntaxTree;
}