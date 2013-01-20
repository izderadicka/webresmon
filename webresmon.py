#!/usr/bin/env python
__version__='0.1'

import os
import time
import paste.urlparser
import gevent
from socketio import socketio_manage
from socketio.server import SocketIOServer
from socketio.namespace import BaseNamespace
import psutil

PORT=8000
MAX_SOCKETS=3

class Sender(object):
    def __init__(self, controler, interval):
        self.controler=controler
        self.running=False
        self.glet=None
        self.interval=interval
        
    def _run(self):
        self.running=True
        prev_net=None
        prev_disk=None
        def io_stats():
            def to_kilos(x):
                return round(x/(self.interval*1000.0),1)
            d=[psutil.disk_io_counters().read_bytes, psutil.disk_io_counters().write_bytes]
            n=[psutil.network_io_counters().bytes_recv, psutil.network_io_counters().bytes_sent]
            return map(to_kilos,d),map(to_kilos,n)
        while self.running:
            
            t= time.time()
            if not prev_net or not prev_disk:
                net=[0,0]
                disk=[0,0]
                prev_disk,prev_net=io_stats()
            else:
                new_disk, new_net=io_stats()
                disk=map(lambda a,b: a-b, new_disk, prev_disk)
                net=map(lambda a,b: a-b, new_net, prev_net)
                prev_disk=new_disk
                prev_net=new_net
                
            cpu_pct=psutil.cpu_percent()
            mem_pct=psutil.virtual_memory().percent
            swap_pct=psutil.swap_memory().percent
            self.controler.emit_to_active('data', self.interval, {'x':t*1000, 'cpu':cpu_pct, 'mem':mem_pct, 
            'swap':swap_pct, 'disk_r':disk[0], 'disk_w':disk[1], 'net_r':net[0], 'net_w':net[1]}
            )
            waited=time.time()-t
            while waited<self.interval:
                gevent.sleep(self.interval-waited)
                waited=time.time()-t
            #print str(id(self))+'-'+str( waited)
                
    def start(self):
        self.glet=gevent.spawn(self._run)
            
    def stop(self):
        self.running=False
        if self.glet:
            self.glet.kill()
        self.glet=None
        

class GraphControler(BaseNamespace):
    active=set()
    sender={}
    def initialize(self):
        self.running=False
        self.interval=1
        
    def _activate(self):
        GraphControler.active.add(self) 
        if not GraphControler.sender.get(self.interval):
            GraphControler.sender[self.interval]=Sender(self, self.interval)   
            GraphControler.sender[self.interval].start()
            
    def _deactivate(self):
        def listening_on_interval(i):
            for ctl in GraphControler.active:
                if ctl.interval==i:
                    return True
        try:
            GraphControler.active.remove(self)
        except KeyError:
            pass
        if GraphControler.sender.get(self.interval) and not listening_on_interval(self.interval):
            GraphControler.sender[self.interval].stop()
            del GraphControler.sender[self.interval]
            
    def on_change_interval(self, new_interval):
        if new_interval==self.interval:
            return
        try:
            new_interval=int(new_interval)
        except ValueError:
            return
        if new_interval<1 or new_interval>3600:
            return
        self._deactivate()
        self.interval=new_interval
        self._activate()
            
    def on_ready(self):
        sockets_connected=len(self.socket.server.sockets)
        print 'Ready %s' % sockets_connected
        if sockets_connected> MAX_SOCKETS:
            self.error("MAX_CONNECTIONS_REACHED", "Maximal limit of connections reached")
            self.disconnect()
            return
        self._activate()
        
    def on_stop(self):
        print 'Stop'
        self._deactivate()
        
    def on_cont(self):
        print "Continue"
        self._activate()
            
    def disconnect(self, *args, **kwargs):
        self._deactivate()
        super(GraphControler, self).disconnect(*args, **kwargs)
        
    def emit_to_active(self, evt, interval, *args):
        for ctl in self.active:
            if ctl.interval==interval:
                ctl.emit(evt, *args)
        
        
class App(object):
    def __init__(self):
        self.static_handler=paste.urlparser.StaticURLParser(os.path.dirname(__file__))
        
        
    def __call__(self, environ, start_response):
        if environ['PATH_INFO'].startswith('/socket.io'):
            return socketio_manage(environ, { '/graph': GraphControler })
        elif environ['PATH_INFO']=='/':
            environ['PATH_INFO']='/static/graph.html'
            return self.static_handler(environ, start_response)
        elif environ['PATH_INFO'].startswith('/static/'):
            return self.static_handler(environ, start_response)

def main():
    
   
    http_server = SocketIOServer(
        ('', PORT),App(), 
        policy_server=False, resource='socket.io'
        )
    # Start the server greenlets
    http_server.serve_forever()
    
    
    






if __name__ == '__main__':
    main()
