 var c = document.getElementById("myCanvas");

 var ctx = c.getContext("2d");
    
 var img = document.getElementById("scream");

  var x = 1;
  var y = 1;

function myCanvas() {
    drawImage();
}

function up(){
    y=y-10;
    drawImage();
    
}

function down(){
    y=y+10;
    drawImage();
}

function left(){
    x = x-10;
    drawImage();
}

function right(){
    x = x+10;
    drawImage();
}

function getKeyPress(event){
    var x = event.keyCode;
//    alert("a key was pressed with keycode:" + x);
    
    switch(x){
        case 38:
            up();
            break;
        case 40:
            down();
            break;
        case 39:
            right();
            break;
        case 37:
            left();
            break;    
    }
    
}

function drawImage(){
    ctx.clearRect(0,0,400,400);
    ctx.drawImage(img,x,y,100,150);
}





