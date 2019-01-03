import assert from 'assert';
import {
    parseCode,
    getFlowTree,
    updateVariableDeclaration,
    buildFlowTree,
    convertFlowTree,
    buildCFGNodes,
    buildCFGEdges, buildCFG
} from '../src/js/code-analyzer';

describe('Test for the javascript parser', () => {
    it('Tests parsing an empty function correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('')),
            '{"type":"Program","body":[],"sourceType":"script"}'
        );
    });

    it('Tests parsing a simple variable declaration correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('let a = 1;')),
            '{"type":"Program","body":[{"type":"VariableDeclaration","declarations":[{"type":"VariableDeclarator","id":{"type":"Identifier","name":"a"},"init":{"type":"Literal","value":1,"raw":"1"}}],"kind":"let"}],"sourceType":"script"}'
        );
    });
});

let input1 = 'function foo(a, b, c){\n' +
    '    let x = a + 1;\n' +
    '    let y = x + b;\n' +
    '    let z = 0;\n' +
    '\n' +
    '    if (y < c) {\n' +
    '        z = z + 5;\n' +
    '    } else if (y < c * 2) {\n' +
    '        z = z + a + 5;\n' +
    '    } else {\n' +
    '        z = z + c + 5;\n' +
    '    }\n' +
    '\n' +
    '    return z;\n' +
    '}';

let input2 = 'function fun(a){\n' +
    '    let z = 0;\n' +
    '    if (y < a) \n' +
    '        a;\n' +
    '    return z;\n' +
    '}\n';

let input3 = 'function fun(){\n' +
    ' while(true)\n' +
    '   true;\n' +
    '    return false;\n' +
    '}';

describe('Test for the flow tree diagram constructor', () => {
    it('Tests parsing an empty function', () => {getFlowTree('', []);});
    it('Tests parsing a simple variable declaration', () => {
        let tree = getFlowTree('let x = 0;', []);assert.equal(tree.body.length, 1);assert.equal(tree.body[0].type, 'VariableDeclarator');assert.equal(tree.body[0].name, 'let x = 0');});
    it('Tests parsing an assignment expression', () => {
        let tree = getFlowTree('x = 0;', []);assert.equal(tree.body.length, 1);assert.equal(tree.body[0].type, 'AssignmentExpression');assert.equal(tree.body[0].name, 'x = 0');});
    it('Tests parsing an assignment expression involving array usage', () => {
        let tree = getFlowTree('let array = []; array[0] = 1;', []);assert.equal(tree.body.length, 2);assert.equal(tree.body[0].name, 'let array = []');assert.equal(tree.body[1].name, 'array[0] = 1');});
    it('Tests once again parsing an assignment expression involving array usage', () => {
        let found_error = false;try {getFlowTree('a=1;a[0] = 1;', []);} catch (TypeError) {found_error = true;}assert.equal(found_error, true);});
    it('Tests parsing an empty function', () => {
        let tree = getFlowTree('function fun(a, b, c){}', [1, 2, 3]);assert.equal(tree.body.length, 1);});
    it('Tests parsing a complex defined function', () => {
        let tree = getFlowTree(input1, [1, 1, 2]);assert.equal(tree.body.length, 1);assert.equal(tree.body[0].body.length, 3);assert.equal(tree.body[0].body.every(x => x.inPath), true);assert.equal(tree.body[0].body[1].inPath, true);assert.equal(tree.body[0].body[1].body[1].inPath, true);assert.equal(tree.body[0].body[1].body[1].body[0].inPath, true);});
    it('Tests parsing a bit more complex defined function', () => {
        let tree = getFlowTree('function fun(a, b, c){\n' + '    let x = a + 1;\n' + '    let y = x + b;\n' + '    let z = [0];\n' + '\n' + '    if (y < c) {\n' + '        z[0] = z + 5;\n' + '    } else if (y < c * 2) {\n' + '        z[0] = z + a + 5;\n' + '    } else {\n' + '        z[0] = z + c + 5;\n' + '    }\n' + '\n' + '    return z;\n' + '}', [1, 1, 2]);assert.equal(tree.body.length, 1);assert.equal(tree.body[0].body.length, 3);assert.equal(tree.body[0].body.every(x => x.inPath), true);assert.equal(tree.body[0].body[1].body[1].inPath, true);assert.equal(tree.body[0].body[1].body[1].body[0].inPath, true);});
    it('Tests parsing a function with conditional statements that do not have alternate', () => {let tree = getFlowTree(input2, [1]);assert.equal(tree.body.length, 1);assert.equal(tree.body[0].body.length, 3);assert.equal(tree.body[0].body.every(x => x.inPath), true);assert.equal(tree.body[0].body[1].body.length, 1);});
    it('Tests parsing a function with a simple while statement', () => {let tree = getFlowTree('function fun(a){\n' + ' let index = 1;\n' + ' while(index<a)\n' + '   index = index+1;\n' + 'if(index==a)\n' + ' a;\n' + ' return index;\n' + '}', [10]);assert.equal(tree.body.length, 1);assert.equal(tree.body[0].body.length, 4);assert.equal(tree.body[0].body.every(x => x.inPath), true);assert.equal(tree.body[0].body[2].body[0].inPath, true);});
    it('Tests parsing a function with a infinite while loop', () => {let handleError = false;try {getFlowTree(input3, []);} catch (Error) {handleError = true;}assert.equal(handleError, false);});
});

describe('Test the flow tree diagram updater', () => {
    it('Tests updating a variable declaration', () => {let environment = {environment: {}};updateVariableDeclaration({name: 'let x = 0'}, environment);assert.deepEqual(environment.environment, {x: 0});});});

let input4 = 'function fun(a, b, c){\n' +
    '    let x = a + 1;\n' +
    '    let y = x + b;\n' +
    '    let z = 0;\n' +
    '\n' +
    '    if (y < c) {\n' +
    '        z = z + 5;\n' +
    '    } else if (y < c * 2) {\n' +
    '        z = z + a + 5;\n' +
    '    } else {\n' +
    '        z = z + c + 5;\n' +
    '    }\n' +
    '\n' +
    '    return z;\n' +
    '}';

describe('Test the flow tree diagram converter', () => {
    it('Tests converting the flow tree diagram', () => {let flowTree = buildFlowTree(input4, [1, 2, 3]);assert.equal(flowTree.body[0].body.length, 5);convertFlowTree(flowTree);assert.equal(flowTree.body[0].body.length, 3);});});

let input5 = 'function fun(a, b, c){\n' +
    '    let x = a + 1;\n' +
    '    let y = x + b;\n' +
    '    let z = 0;\n' +
    '\n' +
    '    if (y < c) {\n' +
    '        z = z + 5;\n' +
    '    } else if (y < c * 2) {\n' +
    '        z = z + a + 5;\n' +
    '    } else {\n' +
    '        z = z + c + 5;\n' +
    '    }\n' +
    '\n' +
    '    return z;\n' +
    '}';

let output1 = 'n0[label="~1~\n' +
    'let x = a + 1\n' +
    'let y = x + b\n' +
    'let z = 0", shape="box" style=filled fillcolor="#a9d18e"]\n' +
    'n1[label="~2~\n' +
    '(y < c)", shape="diamond" style=filled fillcolor="#a9d18e"]\n' +
    'n2[label="~3~\n' +
    'z = z + 5", shape="box" style=filled fillcolor="#ffffff"]\n' +
    'n3[label="~4~\n' +
    '(y < c * 2)", shape="diamond" style=filled fillcolor="#a9d18e"]\n' +
    'n4[label="~5~\n' +
    'z = z + a + 5", shape="box" style=filled fillcolor="#a9d18e"]\n' +
    'n5[label="~6~\n' +
    'z = z + c + 5", shape="box" style=filled fillcolor="#ffffff"]\n' +
    'n6[label="", shape="circle" style=filled fillcolor="#a9d18e"]\n' +
    'return[label="~7~\n' +
    'return z", shape="box" style=filled fillcolor="#a9d18e"]';

let output2 = 'n0[label="~1~\n' +
    'let x = a + 1\n' +
    'let y = x + b\n' +
    'let z = 0", shape="box" style=filled fillcolor="#a9d18e"]\n' +
    'n1[label="~2~\n' +
    '(y < c)", shape="diamond" style=filled fillcolor="#a9d18e"]\n' +
    'n2[label="~3~\n' +
    'z = z + 5", shape="box" style=filled fillcolor="#ffffff"]\n' +
    'n3[label="~4~\n' +
    '(y < c * 2)", shape="diamond" style=filled fillcolor="#a9d18e"]\n' +
    'n4[label="~5~\n' +
    'z = z + a + 5", shape="box" style=filled fillcolor="#a9d18e"]\n' +
    'n5[label="~6~\n' +
    'z = z + c + 5", shape="box" style=filled fillcolor="#ffffff"]\n' +
    'n6[label="", shape="circle" style=filled fillcolor="#a9d18e"]\n' +
    'return[label="~7~\n' +
    'return z", shape="box" style=filled fillcolor="#a9d18e"]';

let input6 = 'function fun(a){\n' +
    '   let x = 0;\n' +
    '   while (x < a) {\n' +
    '       x = x + 1;\n' +
    '   }\n' +
    '   return x;\n' +
    '}';

let input7 = 'function fun(a){\n' +
    '   let x = 0;\n' +
    '   while (x < a);' +
    '   return x;\n' +
    '}';

describe('Tests the context free grammar node builder', () => {
    it('Testing on a complex defined function', () => {
        let flowTree = getFlowTree(input5, [1, 2, 3]);let outputCFGNodes = {nodes: '', n: 0};
        buildCFGNodes(flowTree.body[0], outputCFGNodes);
        assert.equal(outputCFGNodes.n, 7);assert.equal(outputCFGNodes.nodes.includes('let x = a + 1\nlet y = x + b\nlet z = 0'), true);assert.equal(outputCFGNodes.nodes.includes('return z'), true);});
    it('Testing on a complex defined function', () => {
        let flowTree = getFlowTree(input5, [1, 2, 3]);let outputCFGNodes = {nodes: output1, edges: '', n: 7};
        buildCFGNodes(flowTree.body[0],{nodes: '', n: 0});buildCFGEdges(flowTree.body[0], outputCFGNodes);
        assert.equal(outputCFGNodes.n, 7);assert.equal(outputCFGNodes.edges.includes('n0->n1[label=""]'), true);assert.equal(outputCFGNodes.edges.includes('n1->n2[label="T"]'), true);assert.equal(outputCFGNodes.edges.includes('n1->n3[label="F"]'), true);assert.equal(outputCFGNodes.edges.includes('n3->n4[label="T"]'), true);assert.equal(outputCFGNodes.edges.includes('n3->n5[label="F"]'), true);assert.equal(outputCFGNodes.edges.includes('n2->n6[label=""]'), true);assert.equal(outputCFGNodes.edges.includes('n4->n6[label=""]'), true);assert.equal(outputCFGNodes.edges.includes('n5->n6[label=""]'), true);});
    it('Testing on a complex defined function', () => {
        let flowTree = getFlowTree(input5, [1, 2, 3]);let outputCFGNodes = {nodes: output2, edges: '', n: 7};
        buildCFGNodes(flowTree.body[0],{nodes: '', n: 0});buildCFGEdges(flowTree.body[0], outputCFGNodes);
        assert.equal(outputCFGNodes.n, 7);assert.equal(outputCFGNodes.edges.includes('n0->n1[label=""]'), true);assert.equal(outputCFGNodes.edges.includes('n1->n2[label="T"]'), true);assert.equal(outputCFGNodes.edges.includes('n1->n3[label="F"]'), true);assert.equal(outputCFGNodes.edges.includes('n3->n4[label="T"]'), true);assert.equal(outputCFGNodes.edges.includes('n3->n5[label="F"]'), true);assert.equal(outputCFGNodes.edges.includes('n2->n6[label=""]'), true);assert.equal(outputCFGNodes.edges.includes('n4->n6[label=""]'), true);assert.equal(outputCFGNodes.edges.includes('n5->n6[label=""]'), true);});
    it('Tests the creation of the context free grammar', () => {
        let flowTree = buildFlowTree(input6);let outputCFGNodes = buildCFG(flowTree.body[0]);
        assert.equal(outputCFGNodes.includes('n3->return'), true);assert.equal(outputCFGNodes.includes('n0->n1'), true);assert.equal(outputCFGNodes.includes('n1->n2'), true);assert.equal(outputCFGNodes.includes('n2->n1'), true);assert.equal(outputCFGNodes.includes('n1->n3'), true);assert.equal(outputCFGNodes.includes('n0[label="~1~\n' + 'let x = 0"'), true);assert.equal(outputCFGNodes.includes('n1[label="~2~\n' + 'x < a"'), true);assert.equal(outputCFGNodes.includes('n2[label="~3~\n' + 'x = x + 1"'), true);assert.equal(outputCFGNodes.includes('n3[label=""'), true);assert.equal(outputCFGNodes.includes('return[label="~4~\n' + 'return x"'), true);});
    it('Tests once again the creation of the context free grammar', () => {
        let flowTree = buildFlowTree(input7);let outputCFGNodes = buildCFG(flowTree.body[0]);
        assert.equal(outputCFGNodes.includes('n2->return'), true);assert.equal(outputCFGNodes.includes('n0->n1'), true);assert.equal(outputCFGNodes.includes('n1->n1'), true);assert.equal(outputCFGNodes.includes('n1->n2'), true);assert.equal(outputCFGNodes.includes('n0[label="~1~\n' + 'let x = 0"'), true);assert.equal(outputCFGNodes.includes('n1[label="~2~\n' + 'x < a"'), true);assert.equal(outputCFGNodes.includes('n2[label=""'), true);assert.equal(outputCFGNodes.includes('return[label="~3~\n' + 'return x"'), true);});
});