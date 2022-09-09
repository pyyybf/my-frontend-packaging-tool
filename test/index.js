/* Modules */
import mySub from './math';

console.log(mySub(2, 1));

/* Arrow Functions */
[1, 2, 3].map(n => n * 2);
var evens = [2, 4, 6, 8, 10];
// Expression bodies
var odds = evens.map(v => v + 1);
var nums = evens.map((v, i) => v + i);

/* Block Scoping Functions */
var a = 5;
var b = 10;
if (a === 5) {
    let a = 4; // The scope is inside the if-block
    var b = 1; // The scope is inside the function
}

/* Template Literals */
var person = 'Addy Osmani';
console.log(`Yo! My name is ${person}!`);

/* Computed Property Names */
var prefix = 'foo';
var myObject = {
    [prefix + 'bar']: 'hello',
    [prefix + 'baz']: 'world'
};

/* Destructuring Assignment */
var {foo, bar} = {foo: 'lorem', bar: 'ipsum'};
var [a, , b] = [1, 2, 3];

/* Default Parameters */
function f(x, y = 12) {
    // y is 12 if not passed (or passed as undefined)
    return x + y;
}

/* Iterators and For-Of */
for (let element of [1, 2, 3]) {
    console.log(element);
}

/* Classes */
class Hello {
    constructor(name) {
        this.name = name;
    }

    hello() {
        return 'Hello ' + this.name + '!';
    }

    static sayHelloAll() {
        return 'Hello everyone!';
    }
}

class HelloWorld extends Hello {
    constructor() {
        super('World');
    }

    echo() {
        alert(super.hello());
    }
}

var hw = new HelloWorld();
hw.echo();
alert(Hello.sayHelloAll());

/* Numeric Literals */
var binary = [0b0, 0b1, 0b11];
var octal = [0o0, 0o1, 0o10, 0o77];

/* Property Method Assignment */
var object = {
    value: 42,
    toString() {
        return this.value;
    }
};

/* Object Initializer Shorthand */
function getPoint() {
    var x = 1;
    var y = 10;

    return {x, y};
}

/* Rest Parameters */
function f(x, ...y) {
    return x * y.length;
}

/* Spread Operator */
function add(a, b) {
    return a + b;
}

let nums2 = [5, 4];
console.log(add(...nums2));

/* Array-like object to array */
var listFriends = function () {
    var friends = Array.from(arguments);
    friends.forEach(friend => {
        console.log(friend);
    });
};
listFriends('ann', 'bob');
