/* Magic Mirror Node Helper: MMM-MP3Player
 * By asimhsidd
 *
 * Remade by Pavel Smelov.
 * Version 1.2.0 - 2020.09.14
 * GPLv3 License
 */

const NodeHelper = require("node_helper");
const ID3 = require('node-id3');
const path = require('path')
const fs = require('fs');

var music_files_list = [];
var ourMP3 = null
module.exports = NodeHelper.create({
	start: function(){
		ourMP3= this
	},
	socketNotificationReceived: function(notification, payload) {
		switch(notification) {
			case "INITIATEDEVICES":
				music_files_list = [];

				ourMP3.searchMP3(payload.musicPath);
				if(music_files_list.length){
					console.log("["+ourMP3.name+" Found ", music_files_list.length, "track(s)");
					ourMP3.sendSocketNotification("Music_Files",music_files_list);
				}
				else {
					console.log("["+ourMP3.name+" Music may not be found");
				}
				break;
			case "LOADFILE":
				//console.log('["+ourMP3.name+" trying to play next track');
				if (fs.existsSync(payload)){
					fs.readFile(payload, function(err, data) {
						extension = path.basename(payload).split('.').pop(); //extension = path.extname(payload); //returns ext with dot
						var cover = '';
						if (extension == "mp3") {
							tags = ID3.read(data);
							if (typeof tags.image != "undefined") {
								/*var base64String = "";
								for (var i = 0; i < tags.image.imageBuffer.length; i++) {
									base64String += String.fromCharCode(tags.image.imageBuffer[i]);
								}
								cover = "data:image/" + tags.image.mime + ";base64," + Buffer.from(base64String).toString('base64'); */
								cover = "data:image/" + tags.image.mime + ";base64," + tags.image.imageBuffer.toString('base64');
							}
							if (typeof tags.artist == "undefined" && typeof tags.title == "undefined"){ tags.title = path.basename(payload); }
						}
						else {
							tags = {artist:'', title:path.basename(payload)};
						}
						if (cover == '') {
							if (fs.existsSync(path.join(path.dirname(payload),'cover.jpg'))){
								cover = path.join('/', path.dirname(payload), 'cover.jpg');
							}
							else {
								cover = "music.png";
							}
						}
						ourMP3.sendSocketNotification("Music_File",[data,[tags.artist,tags.title], extension, cover]);
					});
				}
				else {
					ourMP3.sendSocketNotification("Error","File can not be opened");
				}
				break;
		}
	},
	searchMP3(startPath){ // thanks to Lucio M. Tato at https://stackoverflow.com/questions/25460574/find-files-by-extension-html-under-a-folder-in-nodejs
		var filter_mp3 = RegExp('.mp3'); // var filter = /.mp3/;
		var filter_flac = RegExp('.flac');
		//var filter_ogg = RegExp('.ogg');
		var filter_wav = RegExp('.wav');
		if (!fs.existsSync(startPath)){
			console.log("["+ourMP3.name+" no dir ",startPath);
			return;
		}
		var files=fs.readdirSync(startPath);
		for(var i=0;i<files.length;i++){
			var filename=path.join(startPath,files[i]);
			var stat = fs.lstatSync(filename);
			if (stat.isDirectory()){
				ourMP3.searchMP3(filename); //recurse
			}else if ( (filter_mp3.test(filename)) || (filter_flac.test(filename)) /*|| (filter_ogg.test(filename))*/ || (filter_wav.test(filename)) ){
				music_files_list.push(filename.replace(/\/\/+/g, '/')); // to avoid double slashes (https://stackoverflow.com/questions/23584117/replace-multiple-slashes-in-text-with-single-slash-with-javascript/23584219)
			}
		}
	}
});
