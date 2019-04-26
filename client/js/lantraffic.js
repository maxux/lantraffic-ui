var shortrates  = ['b', 'K', 'M', 'G', 'T', 'P'];

function elapsedstr(elapsed) {
    if(elapsed < 60)
        return elapsed + ' seconds ago';

    elapsed /= 60
    if(elapsed < 60)
        return elapsed.toFixed(0) + ' minutes ago';

    return (elapsed / 60).toFixed(0) + ' hours ago';
}

//
// return a value prefixed by zero if < 10
//
function zerolead(value) {
	return (value < 10) ? '0' + value : value;
}

function shortrate(value) {
	value = value / 1024;
	uindex = 1;

	for(; value > 1024; value /= 1024)
		uindex++;

	return value.toFixed(2) + ' ' + shortrates[uindex];
}

var socket;

function connect() {
    socket = new WebSocket("ws://10.241.0.254:55574/");

    socket.onopen = function() {
        console.log("websocket open");
        $('#disconnected').hide();
    }

    socket.onmessage = function(msg) {
        json = JSON.parse(msg.data);
        devices_update(json);
    }

    socket.onclose = function() {
        $('#disconnected').show();
        setTimeout(connect, 2000);
    }
}

function rxtxactive(value) {
    if(value < 8 * 1024)
        return 'inactive';

    return 'active';
}

function rxtxclass(value) {
    if(value < 8 * 1024)
        return 'text-muted';

    if(value < 112 * 1024)
        return 'text-default';

    if(value < 1112 * 1024)
        return 'badge-warning';

    return 'badge-danger';
}

function clientscmp(a, b) {
    a = a['addr'].split('.');
    b = b['addr'].split('.');

    for(var i = 0; i < a.length; i++) {
        if((a[i] = parseInt(a[i])) < (b[i] = parseInt(b[i])))
            return -1;

        else if(a[i] > b[i])
            return 1;
    }

    return 0;
}

function devices_update(clients) {
    $('.devices').empty();

    var now = new Date();

    var downarrow = '<span class="glyphicon glyphicon-small glyphicon-arrow-down"></span> ';
    var uparrow = '<span class="glyphicon glyphicon-small glyphicon-arrow-up"></span> ';

    var oclients = []
    for(var host in clients)
        oclients.push({'addr': clients[host]['ip-address'], 'mac': host});

    oclients.sort(clientscmp);

    for(var index in oclients) {
        var client = clients[oclients[index]['mac']];
        var elapsed = (now.getTime() / 1000) - client['timestamp'];
        var rx = (client['rx'] != undefined) ? client['rx'] : null;
        var tx = (client['tx'] != undefined) ? client['tx'] : null;

        var tr = $('<tr>');
        tr.append($('<td>').html(client['ip-address']));
        tr.append($('<td>').html(client['hostname']));
        tr.append($('<td>', {'class': rxtxactive(rx)})
            .append($('<span>', {'class': rxtxclass(rx) + ' badge'}).html(downarrow + shortrate(rx)))
        );
        tr.append($('<td>', {'class': rxtxactive(tx)})
            .append($('<span>', {'class': rxtxclass(tx) + ' badge'}).html(uparrow + shortrate(tx)))
        );

        var badgeclass = 'badge pull-right';
        var badgehtml = "---";

        var badge = $('<span>', {'class': badgeclass}).html(elapsedstr(elapsed.toFixed(0)));
        tr.append($('<td>').append(badge));

        $('.devices').append(tr);
    }
}

$(document).ready(function() {
    connect();
});
