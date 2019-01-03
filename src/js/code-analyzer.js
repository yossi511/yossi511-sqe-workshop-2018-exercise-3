import * as esprima from 'esprima';
import * as js2flowchart from 'js2flowchart';
import * as staticeval from 'static-eval';

/**
 * Size of stack that we maintain.
 * @type {number}
 */
let size = 20;

/**
 * Parses the code.
 * @param code
 */
const parseCode = (code) => {
    return esprima.parseScript(code);
};

/**
 * Parses the given source code with input.
 * @param code
 */
const parseCodeSource = (code) => {
    return esprima.parseScript(code, {loc: true, range: true}, node => node.txt =
        code.substring(node.range[0], node.range[1]));
};

/**
 * Predicate for function declaration element.
 * @param element
 * @returns {boolean}
 */
function isFunctionDeclaration(element) {
    return (element.type === 'Function' && element.subType === 'FunctionDeclaration');
}

/**
 * Predicate for variable declaration element.
 * @param element
 * @returns {boolean}
 */
function isVariableDeclaration(element) {
    return (element.type === 'VariableDeclarator' || element.type === 'AssignmentExpression');
}

/**
 * Predicate for if conditional statement element.
 * @param element
 * @returns {boolean}
 */
function isIfStatement(element) {
    return (element.type === 'Conditional' && element.subType === 'IfStatement');
}

/**
 * Predicate for while statement element.
 * @param element
 * @returns {boolean}
 */
function isWhileStatement(element) {
    return (element.type === 'Loop' && element.subType === 'WhileStatement');
}

/**
 * Predicate for a statement that is not a if conditional or a while statement.
 * @param element
 * @returns {boolean}
 */
function notConditionStatement(element) {
    return !isIfStatement(element) && !isWhileStatement(element);
}

/**
 *
 * @param environment
 * @param key
 * @param value
 */
function updateEnv(environment, key, value) {
    environment.environment[key] = value;
    environment.oldEnvironment != null && environment.oldEnvironment.environment[key] != null ? updateEnv(environment.oldEnvironment, key, value) : null;
}

/**
 *
 * @param environment
 * @param key
 * @param index
 * @param value
 */
function updateArrayEnv(environment, key, index, value) {
    if (environment.environment[key] != null && environment.environment[key].constructor === Array)
        environment.environment[key][index] = value;
    else throw new TypeError('bad');
    environment.oldEnvironment != null && environment.oldEnvironment.environment[key] != null ? updateArrayEnv(environment.oldEnvironment, key, value) : null;
}

/**
 * Updates body function node in the environment.
 * @param functionNode
 * @param environment
 */
function updateBody(functionNode, environment) {
    functionNode.body != null ? functionNode.body.forEach(x => updateFlowTree(x, environment)) : null;
}

/**
 * Updates function declaration statement function node in the environment.
 * @param functionNode
 * @param environment
 */
function updateFunctionDeclaration(functionNode, environment) {
    let paramList = functionNode.name.match(/function[^(]*\(([^)]*)\)/)[1].split(/\W+/);
    paramList.forEach(x => environment.environment[x] = environment.input.pop());
    updateBody(functionNode, environment);
}

/**
 * Updates variable declaration statement function node in the environment.
 * @param functionNode
 * @param environment
 */
function updateVariableDeclaration(functionNode, environment) {
    let expr = functionNode.name.startsWith('let') ? functionNode.name.slice(3) : functionNode.name;
    let parsedExpr = parseCodeSource(expr).body[0].expression;
    let value = staticeval(parsedExpr.right, environment.environment);
    parsedExpr.left.type === 'MemberExpression' ? updateArrayEnv(environment, parsedExpr.left.object.txt,
        parsedExpr.left.property.txt, value) :
        updateEnv(environment, parsedExpr.left.txt, value);
}

/**
 * Updates if statement function node in the environment.
 * @param functionNode
 * @param environment
 */
function updateIfStatement(functionNode, environment) {
    let parsedExpr = parseCodeSource(functionNode.name).body[0].expression;
    let envCopy = JSON.parse(JSON.stringify(environment));
    envCopy.oldEnvironment = environment;
    staticeval(parsedExpr, environment.environment) ? functionNode.body.forEach(child => child.key === 'consequent' ? updateFlowTree(child, envCopy) : null)
        : functionNode.body.forEach(child => child.key === 'alternate' ? updateFlowTree(child, envCopy) : null);
}

/**
 * Updates while statement function node in the environment.
 * @param functionNode
 * @param environment
 */
function updateWhileStatement(functionNode, environment) {
    let parsedExpr = parseCodeSource(functionNode.name).body[0].expression;
    let envCopy = JSON.parse(JSON.stringify(environment));
    envCopy.oldEnvironment = environment;
    if (staticeval(parsedExpr, environment.environment)) {
        updateBody(functionNode, envCopy);
        if (size > 0) {
            size--;
            updateFlowTree(functionNode, environment);
            size++;
        }
        else size = 20;
    }
}

/**
 * Updates the edge function nodes, from given function node range.
 * @param fromFunctionNode
 * @param toFunctionNode
 * @param cfgLabel
 * @param functionCFG
 */
function updateEdgeFunctionNodes(fromFunctionNode, toFunctionNode, cfgLabel, functionCFG) {
    if (!(fromFunctionNode == null || toFunctionNode == null))
        functionCFG.edges += '\n' + fromFunctionNode.n + '->' + toFunctionNode.n + '[label="' + cfgLabel + '"]';
}

/**
 * Updates the context free grammar element.
 * @param doIfCase
 * @param functionNode
 * @param label
 * @param output
 * @param functionCFG
 */
function updateCFGCondition(doIfCase, functionNode, label, output, functionCFG) {
    if (doIfCase == null)
        output.push({node: functionNode.n, label: label});
    else if (notConditionStatement(doIfCase))
        output.push({node: doIfCase.n, label: ''});
    else
        output.push(...buildCFGCondition(doIfCase, functionCFG));
}

/**
 * Getter for the function node statement type.
 * @param functionNode
 * @returns {string}
 */
function getStatementType(functionNode) {
    if (isFunctionDeclaration(functionNode)) {
        return 'FunctionDeclarationStatement';
    }
    else if (isVariableDeclaration(functionNode)) {
        return 'VariableDeclarationStatement';
    }
    else if (isIfStatement(functionNode)) {
        return 'IfStatement';
    }
    else if (isWhileStatement(functionNode)) {
        return 'WhileStatement';
    }
    else {
        return 'BodyStatement';
    }
}

/**
 * Updates the flow tree diagram.
 * @param functionElement
 * @param environment
 */
function updateFlowTree(functionElement, environment) {
    functionElement.inPath = true;
    switch (getStatementType(functionElement)) {
    case 'FunctionDeclarationStatement':
        updateFunctionDeclaration(functionElement, environment);
        break;
    case 'VariableDeclarationStatement':
        updateVariableDeclaration(functionElement, environment);
        break;
    case 'IfStatement' :
        updateIfStatement(functionElement, environment);
        break;
    case 'WhileStatement' :
        updateWhileStatement(functionElement, environment);
        break;
    default :
        updateBody(functionElement, environment);
    }
}

/**
 * Builds the flow tree diagram.
 * @param code
 * @returns {*}
 */
function buildFlowTree(code) {
    return js2flowchart.createFlowTreeBuilder().build(code);
}

/**
 * Converts flow tree diagram.
 * @param flowTree
 */
function convertFlowTree(flowTree) {
    flowTree.body.forEach(flowTreeNode => {
        if(flowTreeNode.type === 'Function'){
            if (flowTreeNode.body.length > 0) {
                addBody(flowTreeNode);
            }
        }
        else
            return null;
    });
}

/**
 * Returns flow tree diagram from given code and respective code input.
 * @param code
 * @param input
 * @returns {*}
 */
function getFlowTree(code, input) {
    let flowTree = buildFlowTree(code);
    updateFlowTree(flowTree, {environment: {}, input: input.reverse()});
    convertFlowTree(flowTree);
    return flowTree;
}

/**
 * Adds and updates body with non conditional function node.
 * @param output
 * @param functionNode
 */
function addNotConditionNode(output, functionNode) {
    let newNode = output.pop();
    if (newNode == null) output.push(functionNode);
    else if (notConditionStatement(newNode)) {
        newNode.name += '\n' + functionNode.name;
        output.push(newNode);
    }
    else {
        output.push(newNode);
        output.push(functionNode);
    }
}

/**
 * Adds and updates body with function node.
 * @param functionNode
 */
function addBody(functionNode) {
    let output = [];
    functionNode.body.forEach(node => {
        if (notConditionStatement(node)) {
            addNotConditionNode(output, node);
        }
        else {
            let consequent = {body: node.body.filter(x => x.key === 'consequent' || x.key === 'body')};
            let alternate = {body: node.body.filter(x => x.key === 'alternate')};
            addBody(consequent);
            addBody(alternate);
            node.body = [...consequent.body, ...alternate.body];
            output.push(node);
        }
    });
    functionNode.body = output;
}

/**
 * B
 * @param functionNode
 * @param functionCFG
 */
function buildCFGReturn(functionNode, functionCFG) {
    functionCFG.nodes += functionNode.n + '[label="", shape="circle" style=filled fillcolor=' + (functionNode.inPath ? '"#a9d18e"' : '"#ffffff"') + ']\n';
    functionCFG.nodes += 'return' + '[label="~' + functionCFG.n + '~\n' + functionNode.name + '", shape="box" style=filled fillcolor=' + (functionNode.inPath ? '"#a9d18e"' : '"#ffffff"') + ']\n';
    functionCFG.edges += functionNode.n + '->return []';
}

/**
 *
 * @param functionNode
 * @param functionCFG
 */
function buildCFGNodes(functionNode, functionCFG) {
    functionNode.body.forEach(functionNode => {
        functionNode.n = 'n' + functionCFG.n++;
        if (functionNode.type === 'ReturnStatement') {
            buildCFGReturn( functionNode, functionCFG);
        } else if (notConditionStatement(functionNode))
            functionCFG.nodes += functionNode.n + '[label="~' + functionCFG.n + '~\n' + functionNode.name + '", shape="box" style=filled fillcolor=' + (functionNode.inPath ? '"#a9d18e"' : '"#ffffff"') + ']\n';
        else {
            functionCFG.nodes += functionNode.n + '[label="~' + functionCFG.n + '~\n' + functionNode.name + '", shape="diamond" style=filled fillcolor=' + (functionNode.inPath ? '"#a9d18e"' : '"#ffffff"') + ']\n';
            buildCFGNodes(functionNode, functionCFG);
        }
    });
}

/**
 * Builds the context free grammar element from given nodes.
 * @param functionNode
 * @param functionCFG
 * @returns {Array}
 */
function buildCFGCondition(functionNode, functionCFG) {
    let output = [];
    if(isIfStatement(functionNode)){
        updateEdgeFunctionNodes(functionNode, functionNode.body.filter(x => x.key === 'consequent')[0], 'T', functionCFG);
        updateEdgeFunctionNodes(functionNode, functionNode.body.filter(x => x.key === 'alternate')[0], 'F', functionCFG);
        updateCFGCondition(buildCFGEdges({body: functionNode.body.filter(x => x.key === 'consequent')}, functionCFG), functionNode, 'T', output, functionCFG);
        updateCFGCondition(buildCFGEdges({body: functionNode.body.filter(x => x.key === 'alternate')}, functionCFG), functionNode, 'F', output, functionCFG);
    }
    if(isWhileStatement(functionNode)){
        updateEdgeFunctionNodes(functionNode, functionNode.body[0], 'T', functionCFG);
        updateCFGCondition(buildCFGEdges({body: functionNode.body}, functionCFG), functionNode, 'while', output, functionCFG);
        output.forEach(node => {
            functionCFG.edges += '\n' + node.node + '->' + functionNode.n + '[label="' + node.label + '\nwhile' + '"]';
        });
        output.length = 0;
        output.push({node: functionNode.n, label: 'F'});
    }
    return output;
}

/**
 * Builds the edge of the context free grammar representation function node.
 * @param functionNode
 * @param functionCFG
 * @returns {*}
 */
function buildCFGEdge(functionNode, functionCFG) {
    if (notConditionStatement(functionNode)) {
        return [{node: functionNode.n, label: ''}];
    }
    else return buildCFGCondition(functionNode, functionCFG);
}

/**
 * Builds the edges of the context free grammar representation function element.
 * @param functionElement
 * @param functionCFG
 * @returns {*}
 */
function buildCFGEdges(functionElement, functionCFG) {
    let functionNodes = [];
    let functionBody = functionElement.body;
    let functionSize = functionElement.body.length - 1;
    for (let i = 0; i < functionSize; i++) {
        functionNodes = buildCFGEdge(functionBody[i], functionCFG);
        functionNodes.forEach(lambda => functionCFG.edges += '\n' + lambda.node + '->' + functionBody[i + 1].n + '[label="' + lambda.label + '"]');
    }
    return functionBody[functionSize];
}

/**
 * Builds context free grammar representation of given function element.
 * @param functionElement
 * @returns {string}
 */
function buildCFG(functionElement) {
    let functionCFG = {nodes: '', edges: '', n: 0};
    buildCFGNodes(functionElement, functionCFG);
    buildCFGEdges(functionElement, functionCFG);
    return functionCFG.nodes + '\n' + functionCFG.edges;
}

export {parseCode, getFlowTree, buildCFG, updateVariableDeclaration, buildFlowTree, convertFlowTree, addNotConditionNode,
    buildCFGNodes, buildCFGEdges

};