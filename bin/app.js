var program = require('commander');

var lexical = require('./lexical');
var syntax = require('./syntax');
var mergeJS = require('./mergeJS');
var transform = require('./transform');

var fs = require('fs');

async function main() {
    program
        .version('0.0.1')
        .parse(process.argv);
    var tokens = lexical.tokenize(process.argv[2]); //词法分析
    var syntaxTree = await syntax.constructTree(tokens); //语法分析，构造语法树

    var path = process.argv[2].split('/');
    path.pop();
    path = path.join('/') + '/';
    mergeJS.merge(syntaxTree, path).then(tree => { //合并
        var res = transform.transformToES5(tree, path); //语法转换
        var distDir = process.argv[3].split('/');
        distDir.pop();
        distDir = distDir.join('/') + '/';
        getDirStat(distDir).then((stat) => {
            mkdir(distDir, stat).then(() => {
                fs.writeFile(process.argv[3], res, 'utf8', (err) => {
                    if (err) throw err;
                    console.log('Got transform result!');
                });
            })
        })
    })
}

function getDirStat(path) {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err) => {
            if (err) {
                resolve(false)
            } else {
                resolve(true)
            }
        })
    })
}

function mkdir(dir, exist) {
    return new Promise((resolve, reject) => {
        if (exist) {
            resolve(true)
        } else {
            fs.mkdir(dir, (err) => {
                if (err) {
                    reject(false)
                } else {
                    resolve(true)
                }
            });
        }
    })
}

main();