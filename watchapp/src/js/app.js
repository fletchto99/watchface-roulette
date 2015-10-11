var UI = require('ui');
var ajax = require('ajax');
var platform = require('platform');
var Wakeup = require('wakeup');

var card = new UI.Card({
  title: 'Watchface Roulette',
  body: 'Firing the guns...'
}).show();

var numWakeups = 0;

Wakeup.each(function() {
    numWakeups++;
});

if (numWakeups <= 1) {
    Wakeup.schedule({
        time: Date.now() / 1000 + getRandomInt(7200, 86400)
    }, function(e) {
        if (e.failed) {
            console.log('Wakeup set failed: ' + e.error);
        } else {
            console.log('Wakeup set! Event ID: ' + e.id);
        }
    });
}

ajax({
    url: 'https://fletchto99.com/other/pebble/appstore/web/api.php',
    type: 'json',
    method: 'post',
    data: {
        method:'max_offset',
        platform: platform.version()
    },
    cache: false
}, function (data) {
    var offset = getRandomInt(0, data.max);
    console.log('Using offsed: ' + offset);
    ajax({
        url: 'https://fletchto99.com/other/pebble/appstore/web/api.php',
        type: 'json',
        method: 'post',
        data: {
            method:'all_faces',
            offset: offset,
            platform: platform.version()
        },
        cache: false
    }, function (data) {
        install(data.watchfaces[getRandomInt(0, data.watchfaces.length - 1)].latest_release.pbw_file);
    }, function (error) {
        card.title('Error');
        card.body('This is odd, we couldn\'t find you a watchface :(');
    });
}, function (error) {
    card.title('Error');
    card.body('This is odd, we couldn\'t connect to the appstore!');
});

function install(pbw) {
    card.title('Preparing...');
    card.body('This should take no more than 5 seconds.');

    var connection = new WebSocket('ws://localhost:9000');
    connection.binaryType = "arraybuffer";

    connection.onclose = function () {
        card.title('Error');
        card.body('Make sure developer connection is enabled and listening for connections!');
    };
    connection.onerror = function () {
        card.title('Preparing...');
        card.body('Make sure developer connection is enabled and listening for connections!');
    };

    connection.onopen = function () {
        connectionOpened(pbw, connection)
    };

    var connectionOpened = function (pbw, connection) {
        card.title('Requesting Watchface');
        card.body('This may take up to 10 seconds');

        var request = new XMLHttpRequest();

        //Fetch the PBW file
        request.open('get',
                     pbw,
                     true);
        request.responseType = "arraybuffer";

        //Send the response to the developer connection to prep it for the watch
        request.onload = function () {
            //Read the data of the pbw
            var buffer = request.response;
            if (buffer) {
                //Convert the buffer to an array of unsigned 8-bit integers
                buffer = new Uint8Array(buffer);

                var final_buffer = new Uint8Array(buffer.length + 1);
                //Apply the PBW array starting at index 1
                final_buffer.set(buffer,
                                 1);

                //Some endpoint to request an install, which the developer connection understands
                final_buffer.set([4]);

                //Send developer connection the bytes of the app
                connection.send(final_buffer);
                card.title('Installing...');
                card.body('This may take up to 15 seconds');
            }
        };

        request.send();
    };
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}