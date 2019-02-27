
var Flac;
if(typeof WEBPACK_BUILD !== 'undefined' && WEBPACK_BUILD){

	require('mmir-lib/workers/workerUtil');

	self.FLAC_SCRIPT_LOCATION = {
		'libflac4-1.3.2.min.js.mem'   : 'mmir-plugin-encoder-flac/libflac.mem',
		'libflac4-1.3.2.min.wasm.wasm': 'mmir-plugin-encoder-flac/libflac.wasm.wasm'
	};
  /**
   * using libflac.js
   * Copyright (C) 2013-2019 DFKI GmbH, F. Petersen A. Russ
   * BSD and partially MIT license (see GitHub repository)
   *
   * @see https://github.com/mmig/libflac.js
   */
	Flac = require('mmir-plugin-encoder-flac/libflac');

	require('mmir-plugin-encoder-core/silenceDetector');
	require('mmir-plugin-encoder-core/encoder');

} else {

  importScripts('workerUtil.js');

	self.FLAC_SCRIPT_LOCATION = {
		'libflac4-1.3.2.min.js.mem'   : 'libflac.mem',
		'libflac4-1.3.2.min.wasm.wasm': 'libflac.wasm.wasm'
	};
  /**
   * using libflac.js
   * Copyright (C) 2013-2019 DFKI GmbH, F. Petersen A. Russ
   * BSD and partially MIT license (see GitHub repository)
   *
   * @see https://github.com/mmig/libflac.js
   */
  if(self.WebAssembly){
  	importScripts('libflac.wasm.js');
	} else {
  	importScripts('libflac.min.js');
	}

  importScripts('silenceDetector.js');
  importScripts('encoder.js');
}


function FlacEncoder(){
	var flac_encoder;
	var flac_ok = 1;
	var STATE = '';// '' | 'initializing' | 'initialized' | 'error'
	var recLengthFlac = 0;

	var tempBuffer = [];
	this.encoded;

	//if encodeBuffer() is called while async-init, the data will be cached in this list until initialization has completed
	this._cached;

	var write_callback_fn = function (buffer, bytes){
	    tempBuffer.push(buffer);
	    recLengthFlac += buffer.byteLength;
//	    console.log("callback: " + tempBuffer);
	};

	this.encoderInit = function(){

		if(!Flac.isReady()){
			var tis = this;
			STATE = 'initializing';
			Flac.onready = function(){
				console.log('FLAC encoder: waited for async init, ready now...');
				tis.encoderInit();
			}
			return;
		}

		//								SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0
		flac_encoder = Flac.create_libflac_encoder(44100, 1, 16, 5, 0);

		if (flac_encoder != 0){
			var status_encoder = Flac.init_encoder_stream(flac_encoder, write_callback_fn);
			flac_ok &= (status_encoder == 0);
			STATE = 'initialized';
		} else {
			STATE = 'error';
			console.log("Error initializing the encoder.");
		}
	};

	this.encodeBuffer = function(buff){

			if(STATE === 'initializing'){
				this._doCache(buff);
				return;
			}
			this._doEncodeCached();

//		console.log("call encodeToFlac");
	    var buf_length = buff.length;

	    //console.log("bufflen: " + buf_length);

	    var buffer_i32 = new Uint32Array(buf_length);
	    var view = new DataView(buffer_i32.buffer);
	    var volume = 1;
	    var index = 0;
	    for (var i = 0; i < buf_length; i++){
	        view.setInt32(index, (buff[i] * (0x7FFF * volume)), true);
	        index += 4;
	    }

	    //clear();//TODO move clear

	    // WAVE - PCM
	    var flac_return = Flac.FLAC__stream_encoder_process_interleaved(flac_encoder, buffer_i32, buf_length);
	    if (flac_return != true){
	            console.log("Error: FLAC__stream_encoder_process_interleaved returned false. " + flac_return);
	    }
//	    else { //PB DEBUB
//	    	console.log("OK: FLAC__stream_encoder_process_interleaved returned true. " + flac_return);
//
//	    }

	 };
	 this.encoderFinish = function(){

		 			this._doEncodeCached();

	        flac_ok &= Flac.FLAC__stream_encoder_finish(flac_encoder);
//	        console.log("flac finish: " + flac_ok);
	        STATE = '';

	        var totalBufferSize = recLengthFlac;
	        //reset current buffers size
	        recLengthFlac = 0;
	        //get & reset current buffer content
	        var buffers = tempBuffer.splice(0, tempBuffer.length);
	        this.encoded = mergeBuffersUint( buffers, totalBufferSize);
//	        console.log("encoded: " + this.encoded);

			Flac.FLAC__stream_encoder_delete(flac_encoder);
	 };
	 this.encoderCleanUp = function(){
		 this.encoderInit();
	 };
	 this._doCache = function(buf){
		 if(!this._cached){
			 this._cached = [buf];
		 } else {
			 this._cached.push(buf);
		 }
	 };
	 this._doEncodeCached = function(){
		 if(this._cached){
			 for(var i=0,size=this._cached.length; i < size; ++i){
				 this.encodeBuffer(this._cached[i]);
			 }
			 this._cached = null;
		 }
	 };
}

//export into global instance variable (see encoder.js for sending/receiving messages on this)
encoderInstance = new FlacEncoder();
