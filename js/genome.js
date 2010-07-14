// set serviceType to:
// 0 - javascript on same server as webservices 
// 1 - javascript served from a seperate server accessed internally
// 2 - javascript served from a seperate server accessed anywhere
// 
var serviceType = 2;
var serviceTypeBam = 6;

var webService = [ "http://127.0.0.1/testservice/",
                   "http://t81-omixed.internal.sanger.ac.uk:6666", // public ro snapshot
                   "http://t81-omixed.internal.sanger.ac.uk:6667", // live pathogens
                   "http://t81-omixed.internal.sanger.ac.uk:6668", // bigtest2
                   "http://t81-omixed.internal.sanger.ac.uk:6669", // jython pathogens
                   "http://www.genedb.org/testservice",
                   "http://127.0.0.1:6666"]; 
var dataType = [ "json", "jsonp", "jsonp", "jsonp", "jsonp", "jsonp", "jsonp" ];

//
// web-artemis/index.html?src=Pf3D7_04&base=200000&width=8000&height=10

var debug = true;
var margin = 5;
var displayWidth = 1000;

var screenInterval = 100;
var baseInterval;
var featureSelected = -1;

var showBam = false;
var showStopCodons = true;
var showGC = false;
var showAG = false;
var showOther = false;
var compare = false;

var count = 0;
var featureDisplayObjs = new Array();
var returnedSequence;
var useCanvas = false;

var colour = [ 
    '255,255,255',
    '100,100,100',
    '255,0,0',
    '0,255,0',
    '0,0,255',
    '0,255,255',
    '255,0,255',
    '245,245,0',
    '152,251,152',
    '135,206,250',
    '255,165,0',
    '200,150,100',
    '255,200,200',
    '170,170,170',
    '0,0,0',
    '255,63,63',
    '255,127,127',
    '255,191,191'
];

$(document).ready(function() {

	var arr = getUrlVars();
	var leftBase = arr["base"];
	
	if(!leftBase) {
		leftBase = 1;
	}
	else {
		leftBase = parseInt(leftBase);
	}

	var basesDisplayWidth = arr["width"];
	if(!basesDisplayWidth) {
		basesDisplayWidth = 8000;
	}
	else {
		basesDisplayWidth = parseInt(basesDisplayWidth);
	}
	
	if(basesDisplayWidth > 50000) {
	  showStopCodons = false;
	} else if(basesDisplayWidth < 1000) {
	  showStopCodons = true;
	}
	  
	var hgt = arr["height"];
	
	var title = '';
	var ypos = 40;
	var lastObj;
	var compCount = 0;
	for(var i in arr) {
		var value = arr[i];
		if(i.indexOf("src") > -1) {
			title+=value+' ';

			if(!hgt) {
				hgt = 10;
			}
			else {
				hgt = parseInt(hgt);
			}
				
			var obj = new featureDisplayObj(basesDisplayWidth, ypos, 30000, value, hgt, leftBase);
			featureDisplayObjs[count - 1] = obj;
			ypos+=250;
			
			if(count > 1) {
				compare = true;
				new comparisonObj(lastObj, obj, compCount);
				compCount++;
			}
			lastObj = obj;
		}
	}

	if(count == 0) {
		if(!hgt) {
			hgt = 12
		}
		else {
			hgt = parseInt(hgt);
		}
		title = 'Pf3D7_01';
		new featureDisplayObj(basesDisplayWidth, 40, 16000, title, hgt, leftBase);
	}
	
	$('ul.sf-menu').superfish();
	$(this).attr("title", title);
	
	if (!$('#sequence'+1).find('canvas').get(0))
	  $('#sequence'+1).append("<canvas width='1px' height ='1px'></canvas>");		
	var canvas = $('#sequence'+1).find("canvas").get(0);
	if(canvas.getContext) {
	  useCanvas = true;
	  debugLog('USE CANVAS');
	}
	$('#sequence'+1).html('');
	
	//testAddFeatures();
});

function featureDisplayObj(basesDisplayWidth, marginTop, sequenceLength, 
		                   srcFeature, frameLineHeight, leftBase) {
	count++;
	this.index = count;
	this.firstTime = true;
	this.basesDisplayWidth = basesDisplayWidth;
	this.marginTop = marginTop;
	this.sequenceLength = sequenceLength;
	this.srcFeature = srcFeature;
	this.frameLineHeight = frameLineHeight;
	this.leftBase = leftBase;
	this.sequence;
	this.minimumDisplay = false;
	
	if(showBam) {
	  this.marginTop = this.marginTop+maxBamHgt;
	}
	
	$('#featureDisplays').append('<div id="featureDisplay'+this.index+'" name="fDisplays" class="canvas"></div>');
	$('#stop_codons').append('<div id="stop_codons'+this.index+'"></div>');
	$('#sequence').append('<div id="sequence'+this.index+'" name="sequences" class="canvas"></div>');
	$('#translation').append('<div id="translation'+this.index+'"></div>');
	$("#slider_vertical_container").append('<div id="slider_vertical_container'+this.index+'"></div>');
	$("#slider_container").append('<div id="slider'+this.index+'"></div>');
	$('#features').append('<div id="features'+this.index+'"></div>');
	$('#ticks').append('<div id="ticks'+this.index+'"></div>');
	
	$('#buttons').append('<div id="left'+this.index+'" class="ui-state-default ui-corner-all" title=".ui-icon-circle-triangle-e"><span class="ui-icon ui-icon-circle-triangle-w"></span></div>');
	$('#buttons').append('<div id="right'+this.index+'" class="ui-state-default ui-corner-all" title=".ui-icon-circle-triangle-e"><span class="ui-icon ui-icon-circle-triangle-e"></span></div>');

	$('#buttons').append('<div id="plus'+this.index+'" class="ui-state-default ui-corner-all" title=".ui-icon-circle-plus"><span class="ui-icon ui-icon-circle-plus"></span></div>');
	$('#buttons').append('<div id="minus'+this.index+'" class="ui-state-default ui-corner-all" title=".ui-icon-circle-minus"><span class="ui-icon ui-icon-circle-minus"></span></div>');

	$('#rightDraggableEdge').append('<div id="rightDraggableEdge'+this.index+'" class="ui-resizable-se"></div>');

	var self = this;
	adjustFeatureDisplayPosition(false, self);

	var scrollbar = $('#slider'+this.index).slider( {
		animate: true,
		min : 1,
		max : self.sequenceLength,
		step : self.basesDisplayWidth/2,
		start: function(event, ui) {
			lastLeftBase = parseInt(ui.value);
	    },
		change : function(ev, ui) {
			self.leftBase = parseInt(ui.value);
			drawAndScroll(self, lastLeftBase);
		}
	});

	$("#slider_vertical_container"+this.index).slider({
		orientation: "vertical",
		min: 0,
		max: self.sequenceLength-140,
		value: self.sequenceLength-self.basesDisplayWidth,
		step: 100,
		change: function(event, ui) {
			zoomOnce(self, scrollbar);
		}
	});
	this.lastLeftBase = leftBase;

	//
	$('#rightDraggableEdge'+this.index).draggable({
		stop: function(event, ui) {
			var xpos = parseInt(
					$('#rightDraggableEdge'+self.index).css('margin-left').replace("px", ""));
			
			self.frameLineHeight = (ui.offset.top-self.marginTop+8)/17;
			displayWidth = (xpos-margin)+ui.offset.left;
			
			// adjust feature display canvas
			var cssObj = {
					 'height': self.frameLineHeight*17+'px',
					 'width': displayWidth+'px'
			};
			$('#featureDisplay'+self.index).css(cssObj);
			
			drawAll(self);
			adjustFeatureDisplayPosition(true, self);
			drawFrameAndStrand(self);
		}
	});

	drawFrameAndStrand(self);
	drawAll(self);
	getOrganismList(self);
	addEventHandlers(self);
}


function drawAndScroll(fDisplay, lastLeftBase) {
	var diff = fDisplay.leftBase - lastLeftBase;
	drawAll(fDisplay);
	scrollDisplay(fDisplay, diff, -1);
}

function scrollDisplay(fDisplay, diff, comparisonIndex) {
	if(fDisplay.comparison != undefined) {
	  for(var i= 0; i<fDisplay.comparison.length; i++) {
		  var comparison = fDisplay.comparison[i];
		  if(comparison.lock && comparison.index != comparisonIndex) {
			  var fDisplay1 = comparison.featureDisplay1;
			  var fDisplay2 = comparison.featureDisplay2;
			  
			  if(fDisplay1.index != fDisplay.index) {
				  updateDisplay(fDisplay1, diff);
				  scrollDisplay(fDisplay1, diff, comparison.index);
			  }
			  if(fDisplay2.index != fDisplay.index) {
				  updateDisplay(fDisplay2, diff);
				  scrollDisplay(fDisplay2, diff, comparison.index);
			  }
		  }
	  }
	}
}

function updateDisplay(fDisplay, diff) {
	var ind = fDisplay.index;  
	var pos = $('#slider'+ind).slider('value')+diff
	if(pos > fDisplay.sequenceLength) {
		pos = fDisplay.sequenceLength - fDisplay.basesDisplayWidth;
	} else if(pos < 1) {
		pos = 1;
	}

	$('#slider'+ind).slider('option', 'value', pos);
	fDisplay.leftBase = pos;
	drawAll(fDisplay);
}

function comparisonObj(featureDisplay1, featureDisplay2, index) {
	this.featureDisplay1 = featureDisplay1;
	this.featureDisplay2 = featureDisplay2;
	this.index = index;
	this.lock = true;
	
	if(!featureDisplay1.comparison) {
		featureDisplay1.comparison = [];
	}
	
	if(!featureDisplay2.comparison) {
		featureDisplay2.comparison = [];
	}

	featureDisplay1.comparison[ featureDisplay1.comparison.length ] = this;
	featureDisplay2.comparison[ featureDisplay2.comparison.length ] = this;
	
	this.selectedMatches = [];
	
	var self = this;
	$('#comparisons').append('<div id="comp'+this.index+'" class="canvas"></div>');
	
	$('#comparisons').append('<div id="compMenu'+this.index+'"></div>');
    $('#compMenu'+this.index).append('<ul id="myMenu'+this.index+'" class="contextMenu">' +
     '<li><a href="#lock" id="lock'+this.index+'">UnLock</a></li>'+
     '<li><a href="#matches" id="matches'+this.index+'">Details</a></li>'+
     '</ul>');
    
    $('#comp'+this.index).contextMenu({
        menu: 'myMenu'+self.index
    },
    function(action, el, pos) {
    	
    	if(action == 'lock') {
    		if(self.lock) {
        		self.lock = false;
        		$('#lock'+self.index).html('Lock');
        	} else {
        		self.lock = true;
        		$('#lock'+self.index).html('UnLock');
        	}
    	} else if(action == 'matches') {
    		
    		var mId = self.selectedMatches[0].match.replace(/(:|\.)/g,'');
    		
    		$("div#matchProps").html("<div id=matchProps"+mId+"></div>");
    	    $("div#matchProps"+mId).dialog({ height: 450 ,
    			width:550, position: 'top', title: 'Selected Matches'});
    	    
    		for(var i=0; i<self.selectedMatches.length; i++) {
    			var match = self.selectedMatches[i];

    			var str1;
    			if(match.f1strand == "1") {
    				str1 = match.fmin1+".."+match.fmax1;
    			} else {
    				var s = parseInt(match.fmin1)+1;
    				str1 = "complement("+s+".."+match.fmax1+")";
    			}
    			
    			var str12
    			if(match.f2strand == "1") {
    				str2 = match.fmin2+".."+match.fmax2;
    			} else {
    				var s = parseInt(match.fmin2)+1;
    				str2 = "complement("+s+".."+match.fmax2+")";
    			}
    			
    			$("div#matchProps"+mId).append(str1+" " +str2+ "  "+ 
    					                   match.score + '<br />');
    		}
    	}
    });

	drawComparison(featureDisplay1);
}

function doubleClickComparison(featureDisplay) {
	if(!featureDisplay.comparison) {
		return;
	}
	
	for(var i=0;i<featureDisplay.comparison.length;i++) {
		var comparison = featureDisplay.comparison[i];
		var matches = comparison.selectedMatches;
		if(matches.length > 0) {
			var centerMatch = matches[0];
			var fDisplay1 = comparison.featureDisplay1;
			var fDisplay2 = comparison.featureDisplay2;

			var center1 = parseInt(centerMatch.fmin1)+((parseInt(centerMatch.fmax1) - parseInt(centerMatch.fmin1))/2);
			var center2 = parseInt(centerMatch.fmin2)+((parseInt(centerMatch.fmax2) - parseInt(centerMatch.fmin2))/2);
			
			if(fDisplay1.srcFeature == centerMatch.f1) {
				fDisplay1.leftBase = Math.round(center1 - (fDisplay1.basesDisplayWidth/2));
				drawAll(fDisplay1);
				$('#slider'+fDisplay1.index).slider('option', 'value', fDisplay1.leftBase);
			}
			
			if(fDisplay2.srcFeature == centerMatch.f2) {
				fDisplay2.leftBase = Math.round(center2 - (fDisplay2.basesDisplayWidth/2));
				drawAll(fDisplay2);
				$('#slider'+fDisplay2.index).slider('option', 'value', fDisplay2.leftBase);
			}
		}
	}
}

function drawComparison(featureDisplay, clickX, clickY, clearSelections) {

	if(!featureDisplay.comparison) {
		return;
	}
	
	for(var i=0;i<featureDisplay.comparison.length;i++) {
		var comparison = featureDisplay.comparison[i];
			
		var serviceName = '/features/blastpair.json?';
		//?subject=Pk_strainH_chr09.embl&target=Pf3D7_10&score=1e-05&start=1&end=1000
		//?blastpair.json?f2=Pk_strainH_chr09.embl&f1=Pf3D7_10&start1=1&end1=10000&start2=1&end2=10000&normscore=0.000000000001

		var fDisplay1 = comparison.featureDisplay1;
		var fDisplay2 = comparison.featureDisplay2;
		
		var start1 = Math.floor(fDisplay1.leftBase);
		var end1   = Math.ceil(start1 + fDisplay1.basesDisplayWidth);
		
		var start2 = Math.floor(fDisplay2.leftBase);
		var end2   = Math.ceil(start2 + fDisplay2.basesDisplayWidth);

		var f1 = fDisplay1.srcFeature;
		var f2 = fDisplay2.srcFeature;
		var normscore = '1e-07';
		var maxLength = 200;
		
		//debugLog(i+" CALL BLASTPAIR "+f1+" ("+start1+".."+end1+") "+f2+" ("+start2+".."+end2+")");
		handleAjaxCalling(serviceName, aComparison,
				{ f1:f1, start1:start1, end1:end1, start2:start2, end2:end2, f2:f2, normscore:normscore, length:maxLength }, featureDisplay, { comparison:comparison, clickX:clickX, clickY:clickY, clearSelections:clearSelections });
	}
}

//
function adjustFeatureDisplayPosition(drag, featureDisplay) {
	var thisMarginTop = featureDisplay.marginTop;
	var thisFLH = featureDisplay.frameLineHeight;
	
	var cssObj = {
			 'margin-left': margin+'px',
			 'position':'absolute',
			 'top': thisMarginTop+(thisFLH*16.8)+'px'
	};
	$('#left'+featureDisplay.index).css(cssObj);

	cssObj = {
			'margin-left': margin+displayWidth+'px',
			'position':'absolute',
			'top': thisMarginTop+(thisFLH*16.8)+'px'
	};
	$('#right'+featureDisplay.index).css(cssObj);
	
	cssObj = {
			'margin-left': margin+margin+displayWidth+'px',
			'position':'absolute',
			'top': thisMarginTop+'px'
	};
	$('#plus'+featureDisplay.index).css(cssObj);
	
	cssObj = {
			'margin-left': margin+margin+displayWidth+'px',
			'position':'absolute',
			'top': thisMarginTop+(thisFLH*11)+'px'
	};
	$('#minus'+featureDisplay.index).css(cssObj);
	

	var buttonWidth = $('#left'+featureDisplay.index).width()+5;
	cssObj = {
        'margin-left': margin+buttonWidth+'px',
        'width': displayWidth-buttonWidth+'px',
        'position':'absolute',
        'top':thisMarginTop+(thisFLH*16.9)+'px'
	};
	$('#slider'+featureDisplay.index).css(cssObj);

	var buttonHeight = $('#plus'+featureDisplay.index).height()+5;
	cssObj = {
	     'margin-left': margin+margin+margin+displayWidth+'px',
	     'height': (thisFLH*11)-(buttonHeight*1.2)+'px',
	     'position':'absolute',
	     'top': thisMarginTop+buttonHeight+'px'
	};
	$('#slider_vertical_container'+featureDisplay.index).css(cssObj);
	$('#featureDisplay'+featureDisplay.index).css('margin-top', thisMarginTop-margin+'px');

	if(!drag) {
		cssObj = {
			'width': '12px', 
			'height': '12px',
			'border-right': '1px solid #FF0000',
			'border-bottom': '1px solid #FF0000',
			'position': 'absolute',
			'opacity':'0.4',
		    'left': margin+displayWidth+'px',
		    'top': thisMarginTop+(thisFLH*16)+'px'
		};
		$('#rightDraggableEdge'+featureDisplay.index).css(cssObj);
	} else {
		$('#rightDraggableEdge'+featureDisplay.index).css('top',thisMarginTop+(thisFLH*16)+'px');
	}
}

//
function addEventHandlers(fDisplay) {
	// show/hide stop codons
	if(fDisplay.index == 1) {
	
		$('#stopCodonToggle').click(function(event){
			showStopCodons = !showStopCodons;
			drawAll(fDisplay);
		});
		
		$('#bamToggle').click(function(event){
			showBam = !showBam;
			if(showBam) {
				$('#bam').append('<div id="bam'+fDisplay.index+'" class="canvas"></div>');
				fDisplay.marginTop = fDisplay.marginTop+maxBamHgt;
			} else {
				$("#bam"+fDisplay.index).html('');
				fDisplay.marginTop = fDisplay.marginTop-maxBamHgt;
			}

			adjustFeatureDisplayPosition(false, fDisplay);
			drawFrameAndStrand(fDisplay);
			drawAll(fDisplay);
		});

	// graphs
		$('#gcGraphToggle').click(function(event){
			if(showGC) {
				if(!showAG && !showOther) {
					$("#graph").css('height', 0+'px');
					$("#graph").html('');
				}
				showGC = false;
			} else {
				setGraphCss(displayWidth, fDisplay.marginTop, margin, fDisplay.frameLineHeight);
				showGC = true;	
			}
			drawAll(fDisplay);
		});
	
		$('#agGraphToggle').click(function(event){
			if(showAG) {
				if(!showGC && !showOther) {
					$("#graph").css('height', 0+'px');
					$("#graph").html('');
				}
				showAG = false;
			} else {
				setGraphCss(displayWidth, fDisplay.marginTop, margin, fDisplay.frameLineHeight);
				showAG = true;	
			}
			drawAll(fDisplay);
		});
	
		$('#otherGraphToggle').click(function(event){
			if(showOther) {
				if(!showGC && !showAG) {
					$("#graph").css('height', 0+'px');
					$("#graph").html('');
				}
				showOther = false;
			} else {
				setGraphCss(displayWidth, fDisplay.marginTop, margin, fDisplay.frameLineHeight);
				showOther = true;
			}
			drawAll(fDisplay);
		});
	}
	
	// popup
	$('#features'+fDisplay.index).mouseenter(function(event){
		var tgt = $(event.target);
	    var x = event.pageX+10;
		var y = event.pageY+10;

	    if( $(tgt).is(".featCDS") ) {
	    	var currentId = $(tgt).attr('id');  
	    	loadPopup("CDS<br />"+currentId,x,y);  
	    } else if( $(tgt).is(".featGene") ) {
	    	var currentId = $(tgt).attr('id');  
	    	loadPopup("Gene<br />"+currentId,x,y);  
	    } else if( $(event.target).is(".feat") ) {
	    	var currentId = $(tgt).attr('id'); 
	    	loadPopup(currentId,x,y);
	    }
	 });
	
	$('#features'+fDisplay.index).click(function(event){
		handleFeatureClick($(event.target), fDisplay);
	 });
	
	$('#features'+fDisplay.index).mouseout(function(event){
		disablePopup();
	 });
	
	$('#translation'+fDisplay.index).click(function(event){
		var aminoacid = $(event.target).attr('id');
		var bgColour = $(event.target).css('background-color');
		$(event.target).css('background-color', '#FFFF00');
	 });
	
	if(count == 2) {
		
		// remove top menu
		$('#menuHeader').html('');
		//
		var last;
		$('#comparisons').click(function(event){
			var compId = $(event.target).parent().attr('id');
			var index = parseInt(compId.replace("comp",""));
			
			var clearSelections = true;
			if (event.shiftKey) {
				clearSelections = false;
			}
			
			// detect double clicks
			var diff = 4000;
			if(last) {
				diff = event.timeStamp - last;
			}
			last = event.timeStamp;
			
			if(!event.shiftKey && diff < 1000) {
				// double click
				debugLog("DOUBLE CLICK ");
				doubleClickComparison(featureDisplayObjs[index]);
				return;
			}

			debugLog("CLICK time between clicks = "+diff);
			drawComparison(featureDisplayObjs[index], event.pageX, event.pageY, clearSelections);
		});
	}
	
	//zoom
	addZoomEventHandlers(fDisplay);

	//scrolling
	addScrollEventHandlers(fDisplay);
}

//
function drawFrameAndStrand(featureDisplay){
	var ypos = featureDisplay.marginTop;
	var thisFLH = featureDisplay.frameLineHeight;
	
	for(var i=0;i<3; i++)
	{
	  var name = 'fwdFrame'+i+featureDisplay.index;
	  $('.'+name).html('');
	  addFrameLine('.fwdFrames',ypos,name, featureDisplay);
	  ypos+=thisFLH*2;
	}
	
	addStrandLine('.strands', ypos, 'fwdStrand'+featureDisplay.index, featureDisplay);
	ypos+=thisFLH*3;
	addStrandLine('.strands', ypos, 'bwdStrand'+featureDisplay.index, featureDisplay);
	
	ypos+=thisFLH*2;
	for(var i=0;i<3; i++)
	{
	  var name = 'bwdFrame'+i+featureDisplay.index;
	  $('.'+name).html('');
	  addFrameLine('.bwdFrames',ypos,name, featureDisplay);
	  ypos+=thisFLH*2;
	}
}

function addStrandLine(selector, ypos, strand, featureDisplay) {
	var thisFLH = featureDisplay.frameLineHeight;
	var cssObj = {
		'height':thisFLH+'px',
		'line-height' : thisFLH+'px',
		'width':displayWidth+'px',
		'margin-left': margin+'px',
		'margin-top': ypos+'px',
		'background':  'rgb(200, 200, 200)',
		'position':'absolute'
	};

	$(selector).append('<div class='+strand+'>&nbsp;</div>');
	$('.'+strand).css(cssObj);
}

function addFrameLine(selector, ypos, frame, featureDisplay) {
	var cssObj = {
		'height':featureDisplay.frameLineHeight+'px',
		'line-height' : featureDisplay.frameLineHeight+'px',
		'width':displayWidth+'px',
		'margin-left': margin+'px',
		'margin-top': ypos+'px',
		'background':  'rgb(240, 240, 240)',
		'position':'absolute'
	};

	$(selector).append('<div class='+frame+'>&nbsp;</div>');
	$('.'+frame).css(cssObj);
}

function drawAll(featureDisplay) {
      $('#featureDisplay'+featureDisplay.index).html('');
      var showSequence = true;
      
      if(showBam && !featureDisplay.minimumDisplay) {
          drawBam(featureDisplay);
      }
      
      if(featureDisplay.minimumDisplay &&
    	$('#slider_vertical_container'+featureDisplay.index).slider('option', 'value') <= featureDisplay.sequenceLength-800) {
    	  showSequence = false;
      }
      
      if(showSequence && (featureDisplay.firstTime || showStopCodons || showGC || showAG || showOther)) {
        getSequence(featureDisplay);
      } else {
    	$('#stop_codons'+featureDisplay.index).html('');
        $('#sequence'+featureDisplay.index).html('');
        $('#translation'+featureDisplay.index).html('');
      }

      drawFeatures(featureDisplay);
	  drawTicks(featureDisplay);
	  
	  if(compare) {
		drawComparison(featureDisplay);
	  }
}

function getSequence(fDisplay) {
	var start = fDisplay.leftBase;
	var end = start+fDisplay.basesDisplayWidth;
	
	if(isZoomedIn(fDisplay)) {
	  if(returnedSequence) {
		  var seq = returnedSequence.response.sequence[0];

		  if(seq.start <= fDisplay.leftBase && seq.end >= end) {
			  aSequence(fDisplay, returnedSequence, {});
			  return;
		  }
	  }
	  end = end + (fDisplay.basesDisplayWidth*8);
	  start = start - (fDisplay.basesDisplayWidth*8);
	  if(start < 1)
		  start = 1;
	} else {
	  currentSeq = null;
	}

	var serviceName = '/regions/sequence.json?';
	handleAjaxCalling(serviceName, aSequence,
			{ uniqueName:fDisplay.srcFeature, start:start, end:end }, 
			fDisplay, {});
}

function drawStopCodons(featureDisplay, basePerPixel) {
    var fwdStops1 = new Array();
    var fwdStops2 = new Array();
    var fwdStops3 = new Array();
    
    var bwdStops1 = new Array();
    var bwdStops2 = new Array();
    var bwdStops3 = new Array();

    //console.time('calculate stop codons');  
    calculateStopCodons(featureDisplay, fwdStops1, fwdStops2, fwdStops3, 'TAG', 'TAA', 'TGA', 1);
    calculateStopCodons(featureDisplay, bwdStops1, bwdStops2, bwdStops3, 'CTA', 'TTA', 'TCA', -1);
    //console.timeEnd('calculate stop codons');
	
	var nstops = fwdStops1.length + fwdStops2.length + fwdStops3.length +
				 bwdStops1.length + bwdStops2.length + bwdStops3.length; 
	if(nstops > 3000) {
		var canvasTop = $('#featureDisplay'+featureDisplay.index).css('margin-top').replace("px", "");
		var mTop = featureDisplay.marginTop;
		var flh  = featureDisplay.frameLineHeight;
		
		drawStopOnCanvas(fwdStops1, mTop+((flh*2)*0+1)-canvasTop, flh, featureDisplay, basePerPixel);
		drawStopOnCanvas(fwdStops2, mTop+((flh*2)*1+1)-canvasTop, flh, featureDisplay, basePerPixel);
		drawStopOnCanvas(fwdStops3, mTop+((flh*2)*2+1)-canvasTop, flh, featureDisplay, basePerPixel);
	
		drawStopOnCanvas(bwdStops1, mTop+(flh*10)+flh+((flh*2)*0+1)-canvasTop, flh, featureDisplay, basePerPixel);
		drawStopOnCanvas(bwdStops2, mTop+(flh*10)+flh+((flh*2)*1+1)-canvasTop, flh, featureDisplay, basePerPixel);
		drawStopOnCanvas(bwdStops3, mTop+(flh*10)+flh+((flh*2)*2+1)-canvasTop, flh, featureDisplay, basePerPixel);
	} else {
		//console.time('draw fwd stop codons');
		drawFwdStop(fwdStops1, 0, featureDisplay, basePerPixel);
		drawFwdStop(fwdStops2, 1, featureDisplay, basePerPixel);
		drawFwdStop(fwdStops3, 2, featureDisplay, basePerPixel);
		//console.timeEnd('draw fwd stop codons');
	
		//console.time('draw bwd stop codons');  
		drawBwdStop(bwdStops1, 0, featureDisplay, basePerPixel);
		drawBwdStop(bwdStops2, 1, featureDisplay, basePerPixel);
		drawBwdStop(bwdStops3, 2, featureDisplay, basePerPixel);
		//console.timeEnd('draw bwd stop codons');
		
		if($('.bases').height() != featureDisplay.frameLineHeight) {
		  $('.bases').css({'height' : featureDisplay.frameLineHeight+'px'});
		}
	}
};


function drawStopOnCanvas(stop, ypos, frameLineHeight, featureDisplay, basePerPixel) {
	var len=stop.length;
	var colour = '#000000';
	for(var i=0; i<len; i++ ) {
		var position1 = stop[i];
		var stopPosition1 = margin+Math.round(stop[i]/basePerPixel);
		$("#featureDisplay"+featureDisplay.index).drawLine(stopPosition1, ypos, stopPosition1, ypos+frameLineHeight,
				{color: colour, stroke:'1'});
	}
}

function drawFwdStop(stop, frame, featureDisplay, basePerPixel) {
  var len=stop.length;
  var ypos = featureDisplay.marginTop+((featureDisplay.frameLineHeight*2)*frame);

  var fwdStopsStr = '';
  for(var i=0; i<len; i+=2 )
  {
	var position1 = stop[i];
	var stopPosition1 = margin+((position1 )/basePerPixel);
	var stopPosition2;
	if(i < len-2)
	  stopPosition2 = margin+((stop[i+1] )/basePerPixel);
	else
	  stopPosition2 = stopPosition1+1;

	var pos = ypos+"px "+stopPosition1+"px";
	var width = (stopPosition2-stopPosition1)+"px";

	fwdStopsStr = fwdStopsStr + '<div id=fs'+position1+' class="bases" style="width:'+width+'; margin:'+pos+'"></div>';
  }
  
  $('#stop_codons'+featureDisplay.index).append(fwdStopsStr);
}

function drawBwdStop(stop, frame, featureDisplay, basePerPixel) {
  var len=stop.length;
  var ypos = featureDisplay.marginTop+(featureDisplay.frameLineHeight*10)+
  			featureDisplay.frameLineHeight+((featureDisplay.frameLineHeight*2)*frame);

  var bwdStopsStr = '';
  for(var i=0; i<len; i+=2 )
  {
	var position1 = stop[i];
	var stopPosition1 = margin+((position1 )/basePerPixel);
	var stopPosition2;
	if(i < len-2)
	  stopPosition2 = margin+((stop[i+1] )/basePerPixel);
	else
	  stopPosition2 = stopPosition1+1;

	var pos = ypos+"px "+stopPosition1+"px";
	var width = (stopPosition2-stopPosition1)+"px";
	
	bwdStopsStr = bwdStopsStr + '<div id=bs'+position1+' class="bases" style="width:'+width+'; margin:'+pos+'"></div>';
  }
  //return bwdStopsStr;
  $('#stop_codons'+featureDisplay.index).append(bwdStopsStr);
}

function getSequnceCanvasCtx(fDisplay, clearCanvas) {
	  var width = $('#featureDisplay'+fDisplay.index).css('width').replace("px", "");
	  var height = fDisplay.frameLineHeight*17;

	  if (!$('#featureDisplay'+fDisplay.index).find('canvas').get(0)) {
		  $('#featureDisplay'+fDisplay.index).append("<canvas  width='"+$('#featureDisplay'+fDisplay.index).css('width')+"' height='"+$('#featureDisplay'+fDisplay.index).css('height')+"' style='position: absolute; top: 0; left: 0;'></canvas>");
	  }
	  
	  var canvas = $('#featureDisplay'+fDisplay.index).find("canvas").get(0);
	  var ctx = canvas.getContext("2d");
	  if(clearCanvas) {
		  ctx.clearRect(0, 0, width, height);
	  }
	  return ctx;
}

function drawCodons(fDisplay, basePerPixel) {
  console.time('draw codons');

  if(useCanvas) {
	  var ctx = getSequnceCanvasCtx(fDisplay, true);
	  var yposFwd = margin+7*fDisplay.frameLineHeight;
  } else {
	  yposFwd = fDisplay.marginTop+(6*fDisplay.frameLineHeight)-1;
  }
  var yposBwd = yposFwd+(fDisplay.frameLineHeight*3)-1;
  
  var xpos = margin;
  
  var baseStr = '';
  for(var i=0;i<fDisplay.basesDisplayWidth; i++) {
	  if(i+fDisplay.leftBase > fDisplay.sequenceLength) {
		  break;
	  }
	  
	  if(useCanvas) {
		drawString(ctx, fDisplay.sequence[i], xpos, yposFwd, '#000000', 0,"Courier New",14);
	  	drawString(ctx, complement(fDisplay.sequence[i]), xpos, yposBwd, '#000000', 0,"Courier New",14);
	  } else {
		baseStr = baseStr+
	  	  '<div class="base" style="margin-top:'+yposFwd+'px; margin-left:'+xpos+'px">'+fDisplay.sequence[i]+'</div>'+
	  	  '<div class="base" style="margin-top:'+yposBwd+'px; margin-left:'+xpos+'px">'+complement(fDisplay.sequence[i])+'</div>';
	  }
	  xpos += (1/basePerPixel);
  }
  if(!useCanvas) {
	  $('#sequence'+fDisplay.index).html(baseStr);
  }
  console.timeEnd('draw codons');
}

function drawAminoAcids(fDisplay, basePerPixel) {
  
  console.time('draw aas');
  var xpos = margin;
  if(useCanvas) {
	  var ctx = getSequnceCanvasCtx(fDisplay, false); 
  } 
  
  var aaStr = '';
  for(var i=0;i<fDisplay.basesDisplayWidth; i++) {
	  
	  if(i+fDisplay.leftBase > fDisplay.sequenceLength) {
		  break;
	  }
	  var frame = (fDisplay.leftBase-1+i) % 3;
	  
	  var aa = getCodonTranslation(fDisplay.sequence[i], 
  			  fDisplay.sequence[i+1], 
  			  fDisplay.sequence[i+2]);
	  
	  
	  if(useCanvas) {
		  var yposFwd = margin+(frame*(fDisplay.frameLineHeight*2))+fDisplay.frameLineHeight;
		  drawString(ctx, aa, xpos, yposFwd, '#000000', 0,"Courier New",14);
	  } else {
		  yposFwd = fDisplay.marginTop+(frame*(fDisplay.frameLineHeight*2))-1;
		  aaStr = aaStr + '<div class="aminoacid" style="margin-top:'+yposFwd+'px; margin-left:'+
		  		xpos+'px; width:'+3/basePerPixel+'px">'+aa+'</div>';   
	  }
	  
  	  var reversePos = fDisplay.sequenceLength-(i+fDisplay.leftBase+1);
  	  frame = 3 - ((reversePos+3)-1) % 3 -1;

	  
	  aa = getCodonTranslation(complement(fDisplay.sequence[i+2]), 
              complement(fDisplay.sequence[i+1]), 
              complement(fDisplay.sequence[i]))
              
	  if(useCanvas) {
		  var yposBwd = margin+(fDisplay.frameLineHeight*11)+
			((fDisplay.frameLineHeight*2)*frame)+fDisplay.frameLineHeight;
		  drawString(ctx, aa, xpos, yposBwd, '#000000', 0,"Courier New",14);
	  } else {
		  yposBwd = fDisplay.marginTop+(fDisplay.frameLineHeight*11)+
			((fDisplay.frameLineHeight*2)*frame)-1;
		  aaStr = aaStr + '<div class="aminoacid" style="margin-top:'+
		  		yposBwd+'px; margin-left:'+xpos+'px; width:'+3/basePerPixel+'px">'+aa+'</div>';
	  }
	  xpos += (1/basePerPixel);
  }
  
  if(!useCanvas) {
	  $('#translation'+fDisplay.index).html(aaStr);
  }
  console.timeEnd('draw aas');
}

function drawFeatures(featureDisplay) {
	var end = parseInt(featureDisplay.leftBase)+parseInt(featureDisplay.basesDisplayWidth);
	
	debugLog("start..end = "+featureDisplay.leftBase+".."+end);
	if(end > featureDisplay.sequenceLength && 
	   featureDisplay.leftBase < featureDisplay.sequenceLength) {
		end = featureDisplay.sequenceLength;
	}
	
	//var serviceName = '/regions/featureloc.json?';
	var serviceName = '/regions/locations.json?';
	var excludes = ['match_part', 'direct_repeat', 'EST_match', 'region'];
	handleAjaxCalling(serviceName, aFeatureFlatten,
			{ region:featureDisplay.srcFeature, 
		      start:featureDisplay.leftBase, end:end, 
		      exclude:excludes }, 
			featureDisplay, { minDisplay:featureDisplay.minimumDisplay });
}

function getFeatureExons(transcript) {
	var nkids = transcript.children.length;
	var exons = [];
	if(nkids > 0)
	{
	  for(var i=0; i<nkids; i++) {
		var kid = transcript.children[i];
		if(kid.type == "exon") {
	       exons.push(kid);
		}
      }	
	}
	
	if(exons.length > 0) {
	  exons.sort(sortFeatures);
	}
	return exons;
}

function getFeaturePeptide(transcript) {
	var nkids = transcript.children.length;
	if(nkids > 0)
	{
	  for(var i=0; i<nkids; i++) {
		var kid = transcript.children[i];	
		if(kid.type == "polypeptide") {
	       return kid;
		}
      }	
	}
	return -1;
}



function getSegmentFrameShift(exons, index, phase) {
  // find the number of bases in the segments before this one
  var base_count = 0;

  for(var i = 0; i < index; ++i) 
  {
    var exon = exons[i];
    base_count += exon.end-exon.start;
  }

  var mod_value = (base_count + 3 - phase) % 3;
  if (mod_value == 1) {
    return 2;
  } else if (mod_value == 2) {
    return 1;
  } 
  return 0;
}

function drawFeature(leftBase, feature, featureStr, ypos, className, basePerPixel) {

  var startFeature = margin+((feature.start - leftBase + 1)/basePerPixel);
  var endFeature   = margin+((feature.end - leftBase + 1)/basePerPixel);
  var extra = '';
  
  if(startFeature < margin) {
    startFeature = margin;
    extra = 'border-left: none;';
  }
  
  if(endFeature > margin+displayWidth) {
	if(startFeature > margin+displayWidth)   
		return featureStr;
    endFeature = margin+displayWidth;
    extra += 'border-right: none';
  }

  var pos = 'margin-top:'+ypos+"px; margin-left:"+startFeature+"px";
  var width = (endFeature-startFeature)+"px";

  featureStr = featureStr + 
	'<div id='+feature.feature+' class="'+className+'" style="width:'+width+'; '+pos+';'+extra+'"></div>';
  return featureStr;
}

function drawFeatureConnections(featureDisplay, lastExon, exon, lastYpos, ypos, colour, basePerPixel) {
	if(featureDisplay.minimumDisplay)
		return;
	
	var exonL;
	var exonR;
	
	if(exon.strand == 1) {
	 exonL = lastExon;
	 exonR = exon;
	} else {
	 exonL = exon;
	 exonR = lastExon;
	 var tmpPos = ypos;
	 ypos = lastYpos;
	 lastYpos = tmpPos;
	}
	
	var lpos = margin+((exonL.end   - featureDisplay.leftBase )/basePerPixel) + 1;
	if(lpos > displayWidth) {
	  return;
	}
	var rpos = margin+((exonR.start - featureDisplay.leftBase +1 )/basePerPixel) - 1;
	var mid  = lpos+(rpos-lpos)/2;
	
	var ymid = ypos-4;
	if(ypos > lastYpos) {
	  ymid = lastYpos-4;
	}
	var Xpoints = new Array(lpos, mid, rpos) ;
	var Ypoints = new Array(lastYpos+4, ymid, ypos+4);
	
	$("#featureDisplay"+featureDisplay.index).drawPolyline(Xpoints,Ypoints, {color: colour, stroke:'1'});
}

function drawArrow(featureDisplay, exon, ypos, basePerPixel) {
	if(featureDisplay.minimumDisplay)
		return;
	
	var Xpoints;
	var Ypoints;
	ypos++;
	
	var frameLineHeight2 = featureDisplay.frameLineHeight/2;
	if(exon.strand == 1) {
	  var end = margin+((exon.end - featureDisplay.leftBase + 1)/basePerPixel);
	  if(end > displayWidth) {
		  return;
	  }
	  Xpoints = new Array(end, end+frameLineHeight2, end) ;
	  Ypoints = new Array(ypos, ypos+frameLineHeight2, ypos+featureDisplay.frameLineHeight);
	} else {
	  var start = margin+((exon.start - featureDisplay.leftBase + 1)/basePerPixel);
	  if(start > displayWidth) {
		  return;
	  }
	  Xpoints = new Array(start, start-frameLineHeight2, start) ;
	  Ypoints = new Array(ypos, ypos+frameLineHeight2, ypos+featureDisplay.frameLineHeight);
	}

	$("#featureDisplay"+featureDisplay.index).drawPolyline(Xpoints,Ypoints, {color:'#020202', stroke:'1'});
}


function drawTicks(fDisplay) {
	baseInterval = (fDisplay.basesDisplayWidth/displayWidth)*screenInterval;
	var basePerPixel  = baseInterval/screenInterval;
	if(baseInterval < 20) {
		baseInterval = 20;
	}
	var nticks = fDisplay.basesDisplayWidth/baseInterval;

	var baseRemainder = (fDisplay.leftBase-1) % baseInterval;
	var start = Math.round(Math.floor((fDisplay.leftBase-1)/baseInterval)*baseInterval);
	
	var xScreen = margin-(1/basePerPixel);

	if(start < 0) {
	  xScreen += (-fDisplay.leftBase/basePerPixel);
	  start = 1;
	} else if(baseRemainder > 0) {
	  xScreen -= ((fDisplay.leftBase-start-1)/basePerPixel);
	}
	
	var thisScreenInterval = baseInterval/basePerPixel;
	$('#ticks'+fDisplay.index).html('');
	for(var i=1; i< nticks+1; i++) {
		xScreen+=thisScreenInterval;
		
		if(xScreen >= displayWidth) {
			break;
		} else if(xScreen < margin) {
			continue;
		}
		var pos = fDisplay.marginTop+(fDisplay.frameLineHeight*9)-14+"px "+xScreen+"px";
		var thisTick = 'tick'+fDisplay.index+i;
		
		var thisStart = Math.round(i*baseInterval)+(start);
		if(thisStart >= 0 && (fDisplay.firstTime || thisStart <= fDisplay.sequenceLength)) {
			$('#ticks'+fDisplay.index).append('<div class="tickClass" id='+thisTick+'></div>');
			setTickCSS(pos, thisStart, '#'+thisTick);
		}
	}
}

function setTickCSS(offset, number, selector) {
	$(selector).css('margin', offset);
	$(selector).html(number);
}


function getOrganismList(featureDisplay) {
	var serviceName = '/organisms/list.json';
	handleAjaxCalling(serviceName, aOrganism,
			{ }, featureDisplay, {});
}

function getSrcFeatureList(taxonomyid, featureDisplay)
{
	$('#srcFeatureSelector').html('');
	var jsonUrl = webService[serviceType]+'/regions/inorganism.json?taxonID='+taxonomyid;

	debugLog(jsonUrl);
	
	var serviceName = '/regions/inorganism.json';
	handleAjaxCalling(serviceName, aSrcFeature,
			{ taxonID:taxonomyid }, featureDisplay, {});
}

function handleFeatureClick(tgt, featureDisplay) {
	featureSelected = $(tgt).attr('id');

	var width = $(tgt).css('borderLeftWidth');
    if(width == '1px') {
	  $(tgt).css('border-width', '2px');
    } else {
      $(tgt).css('border-width', '1px');
    }
    
    var serviceName = '/features/heirarchy.json';
	handleAjaxCalling(serviceName, aShowProperties,
			{ features:featureSelected, root_on_genes:true }, featureDisplay, { featureSelected:featureSelected });
}



function positionFeatureList(featureDisplay) {
	var ghgt = $('#graph').height();
	var top = featureDisplay.marginTop+(featureDisplay.frameLineHeight*19.5)+ghgt; 
	
    var cssObj = {
			 'margin-left': margin+'px',
			 'margin-right': margin+'px',
			 'position':'absolute',
			 'width': displayWidth+'px',
			 'top': top+'px'
	};
	
	$('#featureList').css(cssObj);
}

function setupFeatureList(features, featureDisplay, append) {
	positionFeatureList(featureDisplay);
	if(!append) {
		$('#featureList').html('<table id="featureListTable" class="tablesorter" cellspacing="1"></table>');
		$('#featureListTable').append('<thead><tr><th>Name</th><th>Type</th><th>Feature Start</th><th>Feature End</th><th>Properties</th></tr></thead>');
		$('#featureListTable').append('<tbody>');
	}
	
	for(var i=0; i<features.length; i++) {
		appendFeatureToList(features[i]);
	}
	
	if(!append) {
		$('#featureListTable').append('</tbody>');
		$('#featureListTable').tablesorter(); 
	}
}

function appendFeatureToList(feature) {
	var s = parseInt(feature.start)+1;
	$('#featureListTable').append('<tr>'+
			'<td id="'+feature.feature+':LIST">'+feature.feature+'</td>'+
			'<td>'+feature.type+'</td>'+
			'<td>'+s+'</td>'+
			'<td>'+feature.end+'</td>'+
			'<td id="'+feature.feature+':PROPS"></td>'+
			'</tr>');
}

//
// AJAX functions
//

var aShowProperties = function showProperties(featureDisplay, returned, options) {
    var features = returned.response.heirarchy;
    
    var featureStr = "&features="+options.featureSelected;
	var featurePropertyList = new Array();
	featurePropertyList.push(options.featureSelected);

	for(var i=0; i<features.length; i++ ) {
		var feature = features[i];
		var nkids = feature.children.length;
	  
		if(nkids > 0) {
			for(var j=0; j<nkids; j++ ) { 
				var kid = feature.children[j];
				var exons = getFeatureExons(kid);
				var nexons = exons.length;
				
				for(var k=0; k<nexons; k++) {
					var exon = exons[k];
					if(exon.name == featureSelected ||
					   feature.name == featureSelected) {

						if(nkids == 1) {
							name = feature.name;
						} else {
							name = kid.name;
						}
						featurePropertyList.push(feature.name);
						featureStr += "&features="+feature.name;
						var polypep = getFeaturePeptide(kid);
						if(polypep != -1) {
							featurePropertyList.push(polypep.name);
							featureStr += "&features="+polypep.name;
						}
						break;
					}
				}
			}
		}
	}

	handleAjaxCalling('/features/properties.json?', aFeatureProps,
		'us='+featurePropertyList, -1, {});
	
	handleAjaxCalling('/features/pubs.json?', aFeaturePubs,
			featureStr, -1, {});
	
	handleAjaxCalling('/features/dbxrefs.json?', aFeatureDbXRefs,
			featureStr, -1, {});

	handleAjaxCalling('/features/terms.json?', aFeatureCvTerms,
			featureStr, -1, {});
	
	handleAjaxCalling('/features/orthologues.json?', aOrthologues,
			featureStr, featureDisplay, {});
        
    $("div#properties").html("<div id='DISP"+featureSelected+"'></div>");
    $("div#DISP"+escapeId(featureSelected)).dialog({ height: 450 ,
		width:550, position: 'top', title:name});
}

var aSrcFeature = function ajaxGetSrcFeatures(featureDisplay, returned, options) {
	$('#srcFeatureSelector').html('<select id="srcFeatureList"></select>');
	$('#srcFeatureList').append('<option value="Sequence:">Sequence:</option>');
	
	var srcFeatures  = returned.response.regions;
	for(var j=0; j<srcFeatures.length; j++) {
		var feat = srcFeatures[j];
		if(feat)
		  $('#srcFeatureList').append(
				  '<option value="'+feat+'">'+feat+'</option>');
	}
	
	positionLists();
	
	$('#srcFeatureSelector').change(function(event){
		featureDisplay.srcFeature = $('#srcFeatureList option:selected')[0].value;
		firstTime = true;
		drawAll(featureDisplay);
	});
};

var aOrganism = function ajaxGetOrganisms(featureDisplay, returned, options) {
	var organisms  = returned.response.organisms;
	$('#organismSelector').html('<select id="organismList"></select>');
	$('#organismList').append('<option value="Organism:">Organism:</option>');
	for(var i=0; i<organisms.length; i++) {
		var organism = organisms[i];
		if(organism)
		  $('#organismList').append(
				  '<option value="'+organism.taxonomyid+'">'+organism.name+'</option>');
	}
	
	positionLists();
	
	$('#organismSelector').change(function(event){
		var taxonomyid = $('#organismList option:selected')[0].value;
		getSrcFeatureList(taxonomyid, featureDisplay);
	});
};

function positionLists() {
	// top position
    //var organismWidth = $('#organismSelector').css('width').replace("px", "");
    //var srcFeatureWidth = $('#srcFeatureSelector').css('width').replace("px", "");
    var organismWidth = $('#organismSelector').width();
    var srcFeatureWidth = $('#srcFeatureSelector').width();

	$('#organismSelector').css('margin-left', 
			margin+margin+displayWidth-organismWidth-srcFeatureWidth-10+'px');
	$('#srcFeatureSelector').css('margin-left', 
			margin+margin+displayWidth-srcFeatureWidth+'px');
}

var aFeatureCvTerms = function ajaxGetFeatureCvTerms(featureDisplay, returned, options) {
	showFeatureCvTerm(returned.response.features, featureSelected);
};

var aOrthologues = function ajaxGetOrthologues(featureDisplay, returned, options) {
	var orthologues = returned.response.features;
	var midDisplay = featureDisplay.basesDisplayWidth/2;
	
	if(!orthologues || orthologues.length == 0)
		return;
	
	var clusters = new Array();
	var count = 0;
	
	for(var i=0; i<orthologues.length; i++) {	
		var featureOrthologues = orthologues[i].orthologues;
		for(var j=0; j<featureOrthologues.length; j++) {
			   
		   if(featureOrthologues[j].orthotype == 'polypeptide') {
			   
			 if(count == 0)
				$("div#DISP"+escapeId(featureSelected)).append(
				   "<br /><strong>Orthologues : </strong><br />");
				
			 count++;
		     var featureOrthologue = featureOrthologues[j].ortho;
		     $("div#DISP"+escapeId(featureSelected)).append(
				   '<a href="javascript:void(0)" onclick="openMe(\''+
				   featureOrthologue+'\','+midDisplay+');">'+
				   featureOrthologue+"</a> ("+featureOrthologues[j].orthoproduct+")<br />");
		   } else {
			 clusters.push(featureOrthologues[j].ortho);
		   }
		}
	}
	
	var serviceName = '/features/clusters.json?';
	handleAjaxCalling(serviceName, aCluster,
		'orthologues='+clusters, 
		featureDisplay, {});
};

var aCluster = function ajaxGetClusters(featureDisplay, returned, options) {
	var clusters = returned.response.clusters;
	var midDisplay = featureDisplay.basesDisplayWidth/2;
	
	if(!clusters || clusters.length == 0)
		return;
	
	$("div#DISP"+escapeId(featureSelected)).append(
			   "<br /><strong>Clusters : </strong><br />");
	for(var i=0; i<clusters.length; i++) {	
		var featureCluster = clusters[i].cluster;
		for(var j=0; j<featureCluster.length; j++) {
			   
		   if(featureCluster[j].subject_type == 'polypeptide') {
		     var subject = featureCluster[j].subject;
		     $("div#DISP"+escapeId(featureSelected)).append(
				   '<a href="javascript:void(0)" onclick="openMe(\''+
				   subject+'\','+midDisplay+');">'+
				   subject+"</a><br />");
		   }
		}
	}
}

function openMe(gene, midDisplay) {
	handleAjaxCalling('/features/coordinates.json?', 
			function(featureDisplay, returned, options) { 
		      var src  = returned.response.coordinates[0].regions[0].region; 
		      var base = parseInt(returned.response.coordinates[0].regions[0].fmin)-midDisplay;
		      window.open('?&src='+src+'&base='+base);
		    }, 
			{ features: gene}, {}, {});
}

var propertyFilter = [ 'fasta_file', 'blastp_file', 'blastp+go_file', 'private', 'pepstats_file' ];
var aFeatureProps = function ajaxGetFeatureProps(featureDisplay, returned, options) {
	
	var featProps  = returned.response.features;
    for(var i=0; i<featProps.length; i++) {	
		var featureprops = featProps[i].props;
		for(var j=0; j<featureprops.length; j++) {
			if(!containsString(propertyFilter, featureprops[j].name))
				$("div#DISP"+escapeId(featureSelected)).append(
						featureprops[j].name+"="+featureprops[j].value+"<br />");
		}
	}
};

var aFeaturePubs = function ajaxGetFeaturePubs(featureDisplay, returned, options) {
	var featPubs  = returned.response.features;
	if(!featPubs || featPubs.length == 0)
		return;
	
	$("div#DISP"+escapeId(featureSelected)).append(
			   "<br /><strong>Literature : </strong><br />");
	
    for(var i=0; i<featPubs.length; i++) {	
		var featurepubs = featPubs[i].pubs;
		showFeaturePubs(featurepubs, featureSelected);
	}
    
	$("div#DISP"+escapeId(featureSelected)).append("<br />");
};


var aFeatureDbXRefs = function ajaxGetFeatureDbXRefs(featureDisplay, returned, options) {
	var featDbXRefs  = returned.response.features;
	if(!featDbXRefs || featDbXRefs.length == 0)
		return;
	
	$("div#DISP"+escapeId(featureSelected)).append(
			   "<br /><strong>DbXRefs : </strong><br />");
	
    for(var i=0; i<featDbXRefs.length; i++) {	
		showFeatureDbXRefs(featDbXRefs[i].dbxrefs, featureSelected);
	}
    
	$("div#DISP"+escapeId(featureSelected)).append("<br />");
};

function containsString(anArray, aStr) {
	for(var i=0; i<anArray.length; i++) {
		if(aStr == anArray[i])
			return true;
	}
	return false;
}

var aFeaturePropColours = function ajaxGetFeaturePropColours(featureDisplay, returned, options) {
	var featProps  = returned.response.features;
	for(var i=0; i<featProps.length; i++) {	
		var featureprops = featProps[i].props;
		for(var j=0; j<featureprops.length; j++) {

			if(featureprops[j].name == 'comment')
				$('#'+escapeId(featProps[i].feature+":PROPS")).append(
						featureprops[j].name+"="+featureprops[j].value+";<br />");
			
			if(featureprops[j].name == 'colour') {
				var featureId = escapeId(featProps[i].feature);
				$('#'+featureId).css('background-color', 'rgb('+colour[featureprops[j].value]+')' );
				// colour feature list
				$('#'+escapeId(featProps[i].feature+':LIST')).css('background-color', 'rgb('+colour[featureprops[j].value]+')' );
			}
		}
	}
};

var aFeatureFlatten = function ajaxGetFeaturesFlatten(fDisplay, returned, options) {
	var features  = returned.response.features;
	var nfeatures = features.length;

	debugLog("No. of features "+ nfeatures+"  "+fDisplay.leftBase+".."+
			(parseInt(fDisplay.leftBase)+parseInt(fDisplay.basesDisplayWidth)));

	baseInterval = (fDisplay.basesDisplayWidth/displayWidth)*screenInterval;
	var basePerPixel  = baseInterval/screenInterval;
	  
	var ypos;
	var featureStr = '';
	var featureToColourList = new Array();
	var lastExonParent;
	var nexon = 0;

	var exonMap = new Object();
	var exonParent = new Array();
	
	for(var i=0; i<nfeatures; i++ ) {
	  var feature = features[i];
	  
	  if(feature.type == "exon") {
		  featureToColourList.push(feature.feature);
	  }

	  if(feature.type == "exon") {  
		  var exons = exonMap[feature.part_of];
		  if(exons == undefined) {
			  exons = new Array();
			  exonParent.push(feature.part_of);
			  exonMap[feature.part_of] = exons;
		  }
		  if(feature.strand == 1) {
		     exons.push(feature);
		  } else {
			  exons.unshift(feature);
		  }
		  continue;
	  }
	  
	  if(feature.strand == 1) {
		ypos = fDisplay.marginTop+(fDisplay.frameLineHeight*6);
	  }
	  else {
		ypos = fDisplay.marginTop+(fDisplay.frameLineHeight*9);
	  }	
	  
	  var className = "feat";
	  if(feature.type == "gene") {
		  className = "featGene";
	  }
	  featureStr = drawFeature(fDisplay.leftBase, feature, featureStr, ypos, className, basePerPixel);
	}

	for(var i=0; i<exonParent.length; i++) {
		featureStr = 
			drawExons(fDisplay, exonMap[exonParent[i]], featureStr, basePerPixel);
	}
	
	if(options.append) {
		$('#features'+fDisplay.index).append(featureStr);
	} else {
		$('#features'+fDisplay.index).html(featureStr);
	}

	if(!options.minDisplay) {
		if(isZoomedIn(fDisplay)) {
			$('.feat, .featCDS, .featGene, .featGreen').css('opacity','0.3');
		} else {
			$('.feat, .featCDS, .featGene, .featGreen').css('opacity','0.9');
		}
		
		if($('.feat').height() != fDisplay.frameLineHeight || options.append ) {
			var cssObj = {
				'height':fDisplay.frameLineHeight+'px',
				'line-height' : fDisplay.frameLineHeight+'px'
			};
			$('.feat, .featCDS, .featGene, .featGreen').css(cssObj);
		}
	
		if( count < 2 && 
			featureToColourList.length > 0 && 
			featureToColourList.length < 500 ) {
			setupFeatureList(features, fDisplay, options.append);
			
			if(!options.append) {
				var serviceName = '/features/properties.json?';
				handleAjaxCalling(serviceName, aFeaturePropColours,
					'us='+featureToColourList, 
					fDisplay.leftBase, {});
			}
		}
	}
	return;
};

function drawExons(fDisplay, exons, featureStr, basePerPixel) {
	var sequenceLength = fDisplay.sequenceLength;
	if(exons != undefined) {
	  var lastExon = 0;
	  var lastYpos = -1;
	  var colour = '#666666';
	  var ypos = 0;
		  
	  for(var k=0; k<exons.length; k++) {
	    var exon = exons[k];

		var phase = 0;
		if(exon.phase != "None") {
		   phase = exon.phase;
	    } 

		if(exon.strand == 1) {
		   var frame = ( (exon.start+1)-1+getSegmentFrameShift(exons, k, phase) ) % 3;
		   ypos = fDisplay.marginTop+((fDisplay.frameLineHeight*2)*frame);
		}
		else {
		   var frame = 3 -
		         ((sequenceLength-exon.end+1)-1+getSegmentFrameShift(exons, k, phase)) % 3;
		   ypos = fDisplay.marginTop+(fDisplay.frameLineHeight*9)+
				    		((fDisplay.frameLineHeight*2)*frame);
		}

		featureStr = drawFeature(fDisplay.leftBase, exon, featureStr, ypos, "featCDS", basePerPixel) ;
		var canvasTop = $('#featureDisplay'+fDisplay.index).css('margin-top').replace("px", "");
		if(lastYpos > -1) {
		   drawFeatureConnections(fDisplay, lastExon, exon, 
		    	  lastYpos-canvasTop, ypos-canvasTop, colour, basePerPixel);
		}
		if(k == exons.length-1) {
		   drawArrow(fDisplay, exon, ypos-canvasTop, basePerPixel);
		}
  		lastExon = exon;
  		lastYpos = ypos;
	  }
	}
	return featureStr;
}


var aComparison = function ajaxGetComparisons(featureDisplay, returned, options) {
	var blastFeatures = returned.response.matches;
	var cmp = options.comparison;
	
	var fDisplay1 = cmp.featureDisplay1;
	var fDisplay2 = cmp.featureDisplay2;
	var canvasTop = fDisplay1.marginTop+(fDisplay1.frameLineHeight*16.9);
	var canvasBtm = fDisplay2.marginTop;
	
	var baseInterval1 = (fDisplay1.basesDisplayWidth/displayWidth)*screenInterval;
	var basePerPixel1 = baseInterval1/screenInterval;
	
	var baseInterval2 = (fDisplay2.basesDisplayWidth/displayWidth)*screenInterval;
	var basePerPixel2 = baseInterval2/screenInterval;
	
	var canvasHgt = canvasBtm-canvasTop;
	$('#comp'+cmp.index).html('');
	// adjust comparison canvas
	var cssObj = {
			'margin-top': canvasTop+'px',
			'height': canvasHgt+'px',
			'width': displayWidth+'px',
	};
	$('#comp'+cmp.index).css(cssObj);
	
	if(options.clearSelections) {
		cmp.selectedMatches = [];
	}
	
	for(var i=0; i<blastFeatures.length; i++ ) {
		var match = blastFeatures[i];
		var fmin1 = parseInt(match.fmin1)+1;
		var fmax1 = match.fmax1;
		var fmin2 = parseInt(match.fmin2)+1;
		var fmax2 = match.fmax2;

		var lpos1; 
		var rpos1;
		if(match.f1strand == "1") {
		  lpos1 = margin+((fmin1 - fDisplay1.leftBase)/basePerPixel1);
		  rpos1 = margin+((fmax1 - fDisplay1.leftBase)/basePerPixel1);
		} else {
		  lpos1 = margin+((fmax1 - fDisplay1.leftBase)/basePerPixel1);
		  rpos1 = margin+((fmin1 - fDisplay1.leftBase)/basePerPixel1);
		}

		var lpos2;
		var rpos2;
		if(match.f2strand == "1") {
		  lpos2 = margin+((fmin2 - fDisplay2.leftBase)/basePerPixel2);
		  rpos2 = margin+((fmax2 - fDisplay2.leftBase)/basePerPixel2);
		} else {
		  lpos2 = margin+((fmax2 - fDisplay2.leftBase)/basePerPixel2);
		  rpos2 = margin+((fmin2 - fDisplay2.leftBase)/basePerPixel2);
		}
		
		var Xpoints = new Array(lpos1, rpos1, rpos2, lpos2) ;
		var Ypoints = new Array(0, 0, canvasBtm-canvasTop, canvasBtm-canvasTop);
		
		var clicked = false;
		if(options.clickX != undefined) {
			var match_left_x =
		        lpos1 + ((lpos2 - lpos1) * ((options.clickY-canvasTop-margin) / canvasHgt));

		    var match_right_x =
		    	rpos1 + ((rpos2 - rpos1) * ((options.clickY-canvasTop-margin) / canvasHgt));

			var clickX = options.clickX - margin;
		    if(clickX >= match_left_x - 1 &&
		       clickX <= match_right_x + 1 ||
		       clickX <= match_left_x + 1 &&
		       clickX >= match_right_x - 1) {
		    	clicked = true;
		    	cmp.selectedMatches.push(match);
		    	//debugLog('MATCH '+fmin1+'..'+fmax1+'  '+fmin2+'..'+fmax2+' '+match.score);
		    }
		} 

		if(!clicked && cmp.selectedMatches != undefined) {
			for(var j=0;j<cmp.selectedMatches.length ; j++) {
				if(cmp.selectedMatches[j].match == match.match) {
					clicked = true;
				}
			}
		}

		var colour;
		if(clicked) {
			colour = '#FFFF00';
		} else if( (match.f1strand == "-1" && match.f2strand == "-1") ||
			       (match.f1strand == "1"  && match.f2strand == "1") ) {
			colour = '#FF0000';
		} else {
			colour = '#0000FF';
		}
		$("#comp"+cmp.index).fillPolygon(Xpoints,Ypoints, {color: colour, stroke:'1'});
		/*colour = '#000000';
		if(rpos2-lpos2 > 1 && rpos1-lpos1 > 1) {
			$("#comp"+cmp.index).drawLine(lpos1, 0, lpos2, canvasBtm-canvasTop, {color: colour, stroke:'0.1'});
			$("#comp"+cmp.index).drawLine(rpos1, 0, rpos2, canvasBtm-canvasTop, {color: colour, stroke:'0.1'});
		}*/
	}
}

function isZoomedIn(fDisplay) {
	var seqLen = fDisplay.sequenceLength;
	
	if($('#slider_vertical_container'+fDisplay.index).slider('option', 'value') > seqLen-160) {
		return true;
	} 
	return false;
}

var aSequence = function ajaxGetSequence(fDisplay, returned, options) {
	//sequence = returned.response.sequence[0].dna.replace(/\r|\n|\r\n/g,"").toUpperCase();
	//console.time('draw all');
	var start = returned.response.sequence[0].start;
	
	var sequence = returned.response.sequence[0].dna.substring(fDisplay.leftBase-start).toUpperCase();
	fDisplay.sequence = sequence;
	fDisplay.sequenceLength = returned.response.sequence[0].length;

	baseInterval = (fDisplay.basesDisplayWidth/displayWidth)*screenInterval;
	var basePerPixel  = baseInterval/screenInterval;
	
	debugLog("getSequence() sequence length = "+fDisplay.sequenceLength);
	if((fDisplay.sequenceLength-fDisplay.sequenceLength) != 0) {
      $('#slider'+fDisplay.index).slider('option', 'max', seqLen);
	}

    //console.time('draw stop codons');
    $('#stop_codons'+fDisplay.index).html('');

	if(isZoomedIn(fDisplay)) {
	  drawCodons(fDisplay, basePerPixel);
	  drawAminoAcids(fDisplay, basePerPixel);
	  returnedSequence = returned;
	} else if(showStopCodons) {
	  $('#sequence'+fDisplay.index).html('');
	  $('#translation'+fDisplay.index).html('');
      drawStopCodons(fDisplay, basePerPixel);
	}
    //console.timeEnd('draw stop codons');  

    if (fDisplay.firstTime) {
    	$("#slider_vertical_container"+fDisplay.index).slider('option', 'max', (fDisplay.sequenceLength-140));
    	$("#slider_vertical_container"+fDisplay.index).slider('option', 'value', (fDisplay.sequenceLength-fDisplay.basesDisplayWidth));
    			
    	$('#slider'+fDisplay.index).slider('option', 'max', fDisplay.sequenceLength);
    	$('#slider'+fDisplay.index).slider('option', 'step', fDisplay.basesDisplayWidth/2);
    	$('#slider'+fDisplay.index).slider('option', 'value', fDisplay.leftBase);
    	fDisplay.firstTime = false;
	}

    if(showGC || showAG || showOther) {
    	drawContentGraphs(fDisplay, showAG, showGC, showOther);
    }

    positionFeatureList(fDisplay);
    //console.timeEnd('draw all');
    return;
};

//
//Test code: to test adding extra features and giving them
//a colour
//
function testAddFeatures() {
	var jsonUrl  = 'http://www.genedb.org/testservice'; 
	var service1 = "/regions/locations.json?&region=Pf3D7_06&start=1&end=6627";
	var service2 = "/features/properties.json?";
	
	// Get features and their locations
	$.ajax({
		  url: jsonUrl+service1,
		  dataType: 'jsonp',
		  success: function(returned1) {
		
		var features  = returned1.response.features;
		var featureToColourList = new Array();
		for(var i=0; i<features.length; i++ ) {
		  if(features[i].type == "exon")
			  featureToColourList.push(features[i].feature);
		}
		
		// Get the feature colours
		$.ajax({
			  url: jsonUrl+service2,
			  data: 'us='+featureToColourList,
			  dataType: 'jsonp',
			  success: function(returned2) {	
			addFeatures(featureDisplayObjs[0].srcFeature, returned1);
			aFeaturePropColours(featureDisplayObjs[index], returned2, {});
	  	} } );
	} } );
}

//
//Add extra features on to the feature display and feature list
//
function addFeatures(seqName, jsonFeatureObj) {
	for(index=0;index<featureDisplayObjs.length; index++) {
		if(featureDisplayObjs[index].srcFeature == seqName) {
			aFeatureFlatten(featureDisplayObjs[index], jsonFeatureObj,
					{append:true, minDisplay:featureDisplayObjs[index].minimumDisplay});
			break;
		}
	}
}