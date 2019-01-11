module.exports = function(RED) {
   const i2c = require('i2c-bus');
   const sleep = require('sleep');

   let LCD = class LCD {
    constructor(device, address, cols, rows) {
        this.displayPorts = {
            RS: 0x01,
            E: 0x04,
            D4: 0x10,
            D5: 0x20,
            D6: 0x40,
            D7: 0x80,

            CHR: 1,
            CMD: 0,

            backlight: 0x08,
            RW: 0x02 // not used (?), and why is this wrong in every other library?
        };

        this.buffer = new Buffer(3);  //Required for printlnBuffer.

        // commands
        this.CLEARDISPLAY = 0x01;
        this.RETURNHOME = 0x02;
        this.ENTRYMODESET = 0x04;
        this.DISPLAYCONTROL = 0x08;
        this.CURSORSHIFT = 0x10;
        this.FUNCTIONSET = 0x20;
        this.SETCGRAMADDR = 0x40;
        this.SETDDRAMADDR = 0x80;

        //# flags for display entry mode
        this.ENTRYRIGHT = 0x00;
        this.ENTRYLEFT = 0x02;
        this.ENTRYSHIFTINCREMENT = 0x01;
        this.ENTRYSHIFTDECREMENT = 0x00;

        //# flags for display on/off control
        this.DISPLAYON = 0x04;
        this.DISPLAYOFF = 0x00;
        this.CURSORON = 0x02;
        this.CURSOROFF = 0x00;
        this.BLINKON = 0x01;
        this.BLINKOFF = 0x00;

        //# flags for display/cursor shift
        this.DISPLAYMOVE = 0x08;
        this.CURSORMOVE = 0x00;
        this.MOVERIGHT = 0x04;
        this.MOVELEFT = 0x00;

        //# flags for function set
        this._8BITMODE = 0x10;
        this._4BITMODE = 0x00;
        this._2LINE = 0x08;
        this._1LINE = 0x00;
        this._5x10DOTS = 0x04;
        this._5x8DOTS = 0x00;

        //Line addresses.
        this.LINEADDRESS = [0x80, 0xC0, 0x94, 0xD4];

        this.device = device;
        this.address = address;
        this.cols = cols;
        this.rows = rows;
        this.error = null;
        this.i2c = null;

        this._init();
    };

    _init() {
        this.i2c = i2c.open(this.device, function (err) {
            if (err) {
                console.log('Unable to open I2C port on device ' + device + ' ERROR: ' + err);
                console.log(this);
                this.error = err;
                return this
            }
        });

        this.write4(0x30, this.displayPorts.CMD); //initialization
        this._sleep(4.5);
        this.write4(0x30, this.displayPorts.CMD);
        this._sleep(4.5);
        this.write4(0x30, this.displayPorts.CMD);
        this._sleep(0.15);
        //this.write4(0x20, this.displayPorts.CMD);

        this.write4(this.FUNCTIONSET | this._4BITMODE | this._2LINE | this._5x8DOTS, this.displayPorts.CMD); //4 bit - 2 line 5x7 matrix

        this.write(this.DISPLAYCONTROL | this.DISPLAYON, this.displayPorts.CMD); //LCD on
        this.write(this.CLEARDISPLAY, this.displayPorts.CMD); //LCD clear
        this.write(this.ENTRYMODESET | this.ENTRYLEFT, this.displayPorts.CMD); //set entry mode left (text flows left to right)
        this._sleep(2);
       
        return this;
    };

    _sleep(milli) {
        sleep.usleep(milli * 1000);
    };

    write4(x, c) {
        try {
            let a = (x & 0xF0); // Use upper 4 bit nibble
            this.i2c.sendByteSync(this.address, a | this.displayPorts.backlight | c);
            this.i2c.sendByteSync(this.address, a | this.displayPorts.E | this.displayPorts.backlight | c);
            this.i2c.sendByteSync(this.address, a | this.displayPorts.backlight | c);
        } catch (err) {
            this.error = err;
        }
        this._sleep(2);
    };

    write4Async(x, c) {
        let a = (x & 0xF0); // Use upper 4 bit nibble
        this.i2c.sendByte(this.address, a | this.displayPorts.backlight | c, (err) => {
            if (err) {
                this.error = err;
            }
        });
        this.i2c.sendByte(this.address, a | this.displayPorts.E | this.displayPorts.backlight | c, (err) => {
            if (err) {
                this.error = err;
            }
        });
        this.i2c.sendByte(this.address, a | this.displayPorts.backlight | c, (err) => {
            if (err) {
                this.error = err;
            }
        });

        //Had to add this as it fixes a weird bug where the display was showing garbled text after a few minutes
        //Found this solution by accident though...
        this.i2c.sendByte(this.address, a | this.displayPorts.backlight | c, (err) => {
            if (err) {
                this.error = err;
            }
        });
    };

    write4Block(x, c) {
        let a = (x & 0xF0 );
        this.buffer[0] = a | this.displayPorts.backlight | c;
        this.buffer[1] = a | this.displayPorts.E | this.displayPorts.backlight | c;
        this.buffer[2] = a | this.displayPorts.backlight | c;

        this.i2c.writeI2cBlockSync(this.address, 1, this.buffer.length, this.buffer);
        this._sleep(2);
    };

    write(x, c) {
        this.write4(x, c);
        this.write4(x << 4, c);
        return this;
    };

    writeAsync(x, c) {
        this.write4Async(x, c);
        this.write4Async(x << 4, c);
        return this;
    };

    writeBlock(x, c) {
        this.write4Block(x, c);
        this.write4Block(x << 4, c);
        return this;
    };

    clear() {
        return this.write(this.CLEARDISPLAY, this.displayPorts.CMD);
        this._sleep(4);
    };

    print(str) {
        if (typeof str === 'string') {
            for (let i = 0; i < str.length; i++) {
                let c = str[i].charCodeAt(0);
                this.write(c, this.displayPorts.CHR);
                this._sleep(2);
            }
        }
        return this;
    };

    printAsync(str) {
        if (typeof str === 'string') {
            for (let i = 0; i < str.length; i++) {
                let c = str[i].charCodeAt(0);
                this.writeAsync(c, this.displayPorts.CHR);
                //this._sleep(2);
            }
        }
        return this;
    };

    printBlock(str) {
        if (typeof str === 'string') {
            for (let i = 0; i < str.length; i++) {
                let c = str[i].charCodeAt(0);
                this.writeBlock(c, this.displayPorts.CHR);
                this._sleep(2);
            }
        }
    };

    println(str, line) {
        if (typeof str === 'string') {
            //Set cursor to correct line.
            if (line > 0 && line <= this.rows) {
                this.write(this.LINEADDRESS[line - 1], this.displayPorts.CMD);
                this._sleep(2);
            }
            this.print(str.substring(0, this.cols));
        }
        return this;
    };

    printlnAsync(str, line) {
        if (typeof str === 'string') {
            //Set cursor to correct line.
            if (line > 0 && line <= this.rows) {
                this.writeAsync(this.LINEADDRESS[line - 1], this.displayPorts.CMD);
            }
            this.printAsync(str.substring(0, this.cols));
        }
        return this;

    };

    printlnBlock(str, line) {
        if (typeof str === 'string') {
            if (line > 0) {
                this.write(this.LINEADDRESS[line - 1], this.displayPorts.CMD);
            }

            //Now, write block to i2c.
            this.printBlock(str.substring(0, this.cols));
        }
        return this;
    };

    /** flashing block for the current cursor */
    cursorFull() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKON, this.displayPorts.CMD);
    };

    /** small line under the current cursor */
    cursorUnder() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKOFF, this.displayPorts.CMD);
    }

    /** set cursor pos, top left = 0,0 */
    setCursor(x, y) {
        let l = [0x00, 0x40, 0x14, 0x54];
        return this.write(this.SETDDRAMADDR | (l[y] + x), this.displayPorts.CMD);
    }

    /** set cursor to 0,0 */
    home() {
        return this.write(this.SETDDRAMADDR | 0x00, this.displayPorts.CMD);
    }

    /** Turn underline cursor off */
    blinkOff() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSOROFF | this.BLINKOFF, this.displayPorts.CMD);
    }

    /** Turn underline cursor on */
    blinkOn() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKOFF, this.displayPorts.CMD);
    }

    /** Turn block cursor off */
    cursorOff() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSOROFF | this.BLINKON, this.displayPorts.CMD);
    }

    /** Turn block cursor on */
    cursorOn() {
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON | this.CURSORON | this.BLINKON, this.displayPorts.CMD);
    }

    /** setBacklight */
    setBacklight(val) {
        if (val > 0) {
            this.displayPorts.backlight = 0x08;
        } else {
            this.displayPorts.backlight = 0x00;
        }
        return this.write(this.DISPLAYCONTROL, this.displayPorts.CMD);
    }

    /** Turn display off */
    off() {
        this.displayPorts.backlight = 0x00;
        return this.write(this.DISPLAYCONTROL | this.DISPLAYOFF, this.displayPorts.CMD);
    }

    /** Turn display on */
    on() {
        this.displayPorts.backlight = 0x08;
        return this.write(this.DISPLAYCONTROL | this.DISPLAYON, this.displayPorts.CMD);
    }

    /** set special character 0..7, data is an array(8) of bytes, and then return to home addr */
    createChar(ch, data) {
        this.write(this.SETCGRAMADDR | ((ch & 7) << 3), this.displayPorts.CMD);
        for (let i = 0; i < 8; i++)
            this.write(data[i], this.displayPorts.CHR);
        return this.write(this.SETDDRAMADDR, this.displayPorts.CMD);
    }
};
   
   var lcd;

   function LcdNode(config) {
      console.log("creating LCD node");
      RED.nodes.createNode(this,config);
      var node = this;
      this.LCD_ADDR = parseInt(config.addr);
      this.LCD_BUS = parseInt(config.bus);
      this.LCD_NUMCOLS = parseInt(config.numcols);
      this.LCD_NUMROWS = parseInt(config.numrows);
      console.log("LCD node init @ i2c addr:" + this.LCD_ADDR);
      lcd = new LCD(this.LCD_BUS,this.LCD_ADDR,this.LCD_NUMCOLS,this.LCD_NUMROWS);
          
      this.on('input', function(msg) {
         console.log("LCD input "+msg.topic);
         if (msg.topic.localeCompare("init") == 0) {
             lcd._init();
         }
         
         if (msg.topic.localeCompare("clear") == 0) {
             lcd.clear();
         }

         if (msg.topic.localeCompare("on") == 0) {
             lcd.on();
         }
         
         if (msg.topic.localeCompare("off") == 0) {
             lcd.off();
         }
         
         if (msg.topic.localeCompare("blink_on") == 0) {
             lcd.blinkOn();
         }
         
         if (msg.topic.localeCompare("blink_off") == 0) {
             lcd.blinkOff();
         }

         if (msg.topic.localeCompare("line1") == 0) {
             lcd.println(msg.payload, 1);
         }

         if (msg.topic.localeCompare("line2") == 0) {
             lcd.println(msg.payload, 2);
         }
         
         if (msg.topic.localeCompare("line3") == 0) {
             lcd.println(msg.payload, 3);
         }
         
         if (msg.topic.localeCompare("line4") == 0) {
             lcd.println(msg.payload, 4);
         }
         node.send(msg); //pass message through
      });
   }
      
   RED.nodes.registerType("i2clcd-alt",LcdNode);
    
}
