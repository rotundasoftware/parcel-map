var upper = require('./upper.js');
var widget = require('widget');

module.exports = function () {
    var w = widget(upper('beep'));
    w.appendTo(document.body);
    console.log('beep');
};
