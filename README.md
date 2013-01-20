Simple python script to remotely monitor key system resources (CPU. memory, Net and Disk IO). 
Stats are presented in from of live graphs.

Features:
- presents CPU utilization (summarized for all CPUs), Memory usage (physical and swap) 
  and Net and Disk I/O (kB/s)
- Web based interface with live graphs
- can pause updates 
- can change update interval
- multiple web clients (up to a limit) with possibility for different update intervals in each
- efficient communication (via websocket), lightweighted server (python gevent), efficient data collection

Usage:
- depends on following python libraries - must be installed  (recent versions) 
  before starting this script:
  gevent,  gevent-socketio, paste,  psutil

- then just run and connect with browser to given port -  http://your_address:8000

Licensed under GPL v3.

Version History:
0.1 - Initial Version


