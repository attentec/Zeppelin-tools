/**
 * HSV to RGB according to Wikipedia. https://en.wikipedia.org/wiki/HSL_and_HSV
 */


export default function (h, s, v) {
    let c = v*s;
    let hp = (h / 60);
    let i = Math.floor(hp);
    let x = c * (1-Math.abs((hp%2)-1));
    let m = v-c;
    let cm = c+m;
    let xm = x+m;
    let rgb = [];

    if (s === 0) {
        rgb = [m, m, m];
    } else {

        if(i === 0) {
            rgb = [cm, xm, m];
        } else if(i===1){
            rgb = [xm, cm, m];
        } else if(i===2){
            rgb = [m, cm, xm];
        } else if(i===3){
            rgb = [m, xm, cm];
        } else if(i===4){
            rgb = [xm, m, cm];
        } else{
            rgb = [cm, m, xm];
        }
    }
    return '#' +
        ("0" + Math.round(rgb[0]*255).toString(16)).slice(-2) +
        ("0" + Math.round(rgb[1]*255).toString(16)).slice(-2) +
        ("0" + Math.round(rgb[2]*255).toString(16)).slice(-2);
}