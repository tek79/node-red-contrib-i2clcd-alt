#***Intro and Usage***

![img here](img01.png)

A simple node-red node that provides control of 1602/2004 LCDs with a PCF8574T/AT i2c driver backpack. Based on the following libraries:

https://github.com/sweetpi/i2c-lcd/

https://github.com/johnty/node-red-contrib-i2clcd

https://github.com/craigmw/lcdi2c

https://github.com/wilberforce/lcd-pcf8574

Updated to use i2c-bus instead of i2c, which will not compile on Armbian/Orange Pi.

Set node configuration to match your devices. Defaults to: i2c bus **0**, address **0x3f** and a **20** column by **4** row (2004) LCD.

Use topic **line1** through **line4** to send **msg.payload** to each line. Messages will be truncated at the length specified in the node's column setting.

Use topic **clear** to clear screen. 

Use topic **init** to re-initialize screen. 

Tested on Armbian Bionic on Orange Pi Zero (H2) hardware under Node 8.15.0, Node 10.15.0

Tested on Armbian Bionic on Orange Pi One (H3) hardware under Node 10.15.0

****Requirements****

- ARM-based SBC with i2c bus
- 1602 or 2004 LCD panel that has a PCF8574T/AT i2c driver
- i2c-bus node (available in npm repo)

****Notes****

- Rate limiting of incoming messages is not necessary when using this library.

- Node sleep (dependency) seems to install with some errors under Node versions > 8.x, investigating replacing this althoug it appears to be working.

Tek79

January 2019
