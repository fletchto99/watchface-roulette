var UI = require('ui');
var ajax = require('ajax');
var platform = require('platform');
var Wakeup = require('wakeup');

//A simple welcome message
var card = new UI.Card({
  title: 'Watchface Roulette',
  body: 'Firing the guns...'
}).show();

//Check to ensure a wakeup is not scheduled
var numWakeups = 0;
Wakeup.each(function() {
    numWakeups++;
});

//Schedule a wakeup to change the watchface
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
} else {
    console.log('wakeup already scheduled');
}

//Determine how many watchfaces are avaliable to install from
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
    //select a random watchface to install
    findRandomWatchface(data);
    console.log('Searching for watchface');
}, function () {
    card.title('Error');
    card.body('This is odd, we couldn\'t connect to the appstore!');
});

/*
 * Finds a random .pbw watchface in the appstore and prepares it to be installed
 */
function findRandomWatchface(data) {
    var offset = getRandomInt(0, data.max);
    //Useful if an offset ever fails
    console.log('Using offset: ' + offset);
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
    }, function () {
        card.title('Error');
        card.body('This is odd, we couldn\'t find you a watchface :(');
    });
}

/*
 * Installs a pbw over the developer connection to the watch
 */
function install(pbw) {
    card.title('Preparing...');
    card.body('This should take no more than 5 seconds.');

    var connection = new WebSocket('ws://localhost:9000');
    connection.binaryType = "arraybuffer";

    //The connection will close if there is no websocket server running because it is not connected to the wifi
    connection.onclose = function () {
        card.title('Error');
        card.body('Make sure developer connection is enabled and connected to wifi! Otherwise watchface roulette will not work.');
    };

    //The connection may recieve an error if the developer connection is disabled
    connection.onerror = function () {
        card.title('Error');
        card.body('Make sure developer connection is enabled! Otherwise watchface roulette will not work.');
    };

    //Request and install the app once the connection is opened
    connection.onopen = function () {
        connectionOpened(pbw, connection)
    };

    var connectionOpened = function (pbw, connection) {
        //update the status card
        card.title('Requesting Watchface');
        card.body('This may take up to 10 seconds');

        //Prepare to request the app
        var request = new XMLHttpRequest();

        //Fetch the PBW file
        request.open('get', pbw, true);

        //Tell the connection we expect an array buffer
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
                final_buffer.set(buffer, 1);

                //Some endpoint to request an install, which the developer connection understands
                final_buffer.set([4]);

                //Send developer connection the bytes of the app
                connection.send(final_buffer);

                //Update the card to display the status
                card.title('Installing...');
                card.body('This may take up to 15 seconds');
            }
        };

        request.send();
    };
}

/*
 * Returns a random number from within a range of numbers
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}