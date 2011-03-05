cone activities
===============

Installation
------------

> git clone git@github.com:bluedynamics/cone.activities.git

this build needs (on debian based systems):
sudo apt-get install libpcre3-dev

> python2.6 bootstrap.py -c dev.cfg
> ./bin/buildout -c dev.cfg


Start/Stop
----------

> ./bin/nginxctl [start|stop]

Browse "http://localhost:8081/" with Firefox.


TODO
====

bdajax related
--------------

  * loadSpeed: 0 L236 configurable


Licence
=======

GNU General Public License Version 2