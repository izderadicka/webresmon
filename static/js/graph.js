$(function() {
    var socket = io.connect('/graph');
    var $interval = $('#interval_input');
    var $pauseButton=$('#pause_btn');
    var paused=false;
    var datalen = 100;
    var interval=1;
    var tzOffset=-(new Date().getTimezoneOffset())
    
    var kbFormatter=function(val, axis) {
    	if (val>=1000) {
    	return (val/1000).toFixed(axis.tickDecimals+1) + " MB/s";
    	} else {
    	return (val).toFixed(axis.tickDecimals) + " kB/s";
    	}
    };
    var pctFormatter=function(val, axis) {
    	return (val).toFixed(axis.tickDecimals) + " %";
    }
    
    var timeFormatter= function (val, axis) {
    	var lz=function(n){
    		var res=n.toString();
    		return res.length<2?'0'+res:res
    	}
    var d = new Date(val);
    return lz(d.getHours()) + ":" + lz(d.getMinutes())+":"+lz(d.getSeconds());
}
    var graphOptions={
                xaxis:{
                    mode: "time",
                    tickFormatter: timeFormatter,
                    timezone: 'browser', //seems not to work
                    timeformat: "%H:%M:%S",
                    minTickSize: [1, "minute"],
                },
                yaxis: {
                    min: 0,
                },
                series : {
        				label: null,
        				lines: { 
            			show: true,
            			fill: false,
            	shadowSize: 0
        			},
        			points: {
            		show:false
        			}},
           };
           
    var graphs={ cpu_graph:{
    							series: [{key:'cpu', color:'green'}], 
    							options:$.extend(true, {}, graphOptions, {yaxis: {
                    max: 100, tickFormatter:pctFormatter }})},
    						 mem_graph: {
    						 	series: [{key:'mem', label:"Memory", color:'green'},
    						 						{key:'swap', label:"Swap", color:'pink'}],
    						 	options:$.extend(true, {}, graphOptions, {yaxis: {
                    max: 100, tickFormatter:pctFormatter }})
    						 },
    						 disk_graph: {
    						 	series:[{key:"disk_r", label: "Read", color:'blue'},
    						 					{key:"disk_w", label: "Written", color:"red"}],
    						 					options:$.extend(true, {}, graphOptions,
    						 						{yaxis:{max:null, tickFormatter:kbFormatter}} )
    						 },
    						 net_graph: {
    						 	series:[{key:"net_r", label: "Received", color:'blue'},
    						 					{key:"net_w", label: "Sent", color:"red"}],
    						 					options:$.extend(true, {}, graphOptions,
    						 						{yaxis:{max:null, tickFormatter:kbFormatter}} )
    						 },
    					}
    
    var updateGraph= function( graphId, newData) {
    	  var graph=graphs[graphId],
    	  series=[]
    	  var initData=function(s,ts) {
    	  	s.data=[]
    	  	for (var i=datalen-1; i>=0; i-=1) {
    	  		s.data[i]=[ts,0];
    	  		ts-=interval*1000;
    	  	}
    	  }
    	  
    	  for (var i=0;i<graph.series.length;i+=1) {
    	  	var serie=graph.series[i];
    	  	if (!serie.data) {
    	  		initData(serie, newData.x-interval*1000)
    	  	}
    	  	serie.data.push([newData.x, newData[serie.key]]);
        	while (serie.data.length > datalen) {
            serie.data.shift();
        		}
    	  }
    	  
    		
        if(graph.plot) {
            graph.plot.setData(graph.series);
            graph.plot.setupGrid();
            graph.plot.draw();
        } else  {
            graph.plot = $.plot($('#'+graphId), graph.series, graph.options);
            //graph.plot.draw();
        }
    	
    };
    
    $pauseButton.click(function(){
    	var that=$(this);
    	if (paused) {
    		socket.emit('cont');
    		that.val('Pause');
    		paused=false;
    		$interval.removeAttr('disabled')
    	} else {
    		socket.emit('stop');
    		that.val('Resume');
    		paused=true;
    		$interval.attr('disabled', true)
    	};
    	
    });
    socket.on('data', function(data) {
        //console.log("Data", data.toSource())
        for (var key in graphs) {
        	if (graphs.hasOwnProperty(key)) {
        updateGraph(key, data  );
        }
        }
        
    });
    socket.on('connect', function(evt) {
        $('#conn_status').html('<b>Connected</b>');
        socket.emit('ready');
        $interval.val(1);
        $interval.change(function(evt){
        	var new_interval=parseInt($interval.val())
        	if (new_interval<1 ) {
        		new_interval=1
        	} else if (new_interval>3600) {
        		new_interval=3600
        	};
        		
        	socket.emit('change_interval', new_interval);
        	$interval.val(new_interval);
        	interval=new_interval
        })
    });
    socket.on('error', function(name, desc) {
        $('#conn_status').html('<b>Error</b>');
        alert('Error '+name+'\n'+desc)
        $internal
    });
    socket.on('disconnect', function(evt) {
        $('#conn_status').html('<b>Closed</b>');
    })
});

