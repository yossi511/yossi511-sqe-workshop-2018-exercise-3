import $ from 'jquery';
import {parseCode, getFlowTree, buildCFG} from './code-analyzer';
import * as d3 from 'd3-graphviz';

$(document).ready(function () {
    $('#codeSubmitButton').click(() => {
        let code = $('#codePlaceholder').val();
        let parsedCode = parseCode(code);
        $('#parsedCode').val(JSON.stringify(parsedCode, null, 2));
    });
    $('#codeHTMLButton').click(() => {
        document.getElementById('flowChart').innerHTML = $('#parsedCode').val();
    });
    $('#codeFlowButton').click(() => {
        let code = $('#codePlaceholder').val();
        let flowTree = getFlowTree(code, JSON.parse('[' + $('#inputVector').val() + ']'));
        d3.graphviz('#flowChart')
            .renderDot('digraph { ' + buildCFG(flowTree.body[0]) + ' }');
    });
});