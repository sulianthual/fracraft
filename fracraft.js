// $Id$
/*
* Copyright (c) 2011 Bentech
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program. If not, see <http://www.gnu.org/licenses/>.
*/
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//------------------------- fracraft-------------------------------
// 
// This script generates structures in minecraft using iterations (like fractals) 
//
// made by: Sulian Thual
//
// Needed:
// - WorldEdit (http://wiki.sk89q.com/wiki/WorldEdit/Scripting)
//  for example install Single Player Commands (that includes WorldEdit)
// - The Rhino javascript engine (http://wiki.sk89q.com/wiki/WorldEdit/Scripting)
//   (or put the js.jar in .minecraft/bin/)
//
// How to use:
// -select a cuboid region in WorldEdit (the initial selection)
//  type: /cs fracraft pattern iterations arg1 arg2 arg3
//  for example: /cs fracraft fcube 3
//
// Input Arguments:  
//
// -pattern(string): name of pattern to use
//  PATTERNS CAN BE EDITED/ADDED (see end of script)
// 
// -iterations(integer): number of iterations N to perform (that change parents to childs)
//  if N>=0, performs N iterations and builds all of them
//  if N<0, performs abs(N) iterations and builds only the last one
//  default is 0 iterations
// 
// -arg1, arg2, arg3: any type of arguments that are specific to the pattern
//
//   BEWARE OF LARGE ITERATIONS AND LARGE BUILDS FOR YOUR MEMORY !
//  - the computation cost increases very quickly with N, at least in (childs)^N 
//  - privilegy N<0 to make large builds step by step (N=0, N=-1,N=-2,N=-3...)
//  - modify the worldedit.properties file, with scripting-timeout=30000
//  - stop iterating copying when something is too big, has too many...
//    this can crash you minecraft or even corrupt your world !!!!!!!
// 
//  See further instructions at the end of the script
//
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
// Main Program
//
// Import packages
importPackage(Packages.java.io);
importPackage(Packages.java.awt);
importPackage(Packages.com.sk89q.worldedit);
importPackage(Packages.com.sk89q.worldedit.blocks);
player.print("----- fracraft------");
//var time1 = new Date();//execution time for debug
//
// Import user arguments
var blocks = context.remember();
var session = context.getSession();
var region = session.getRegion();
var pattern = argv.length > 1 ? argv[1] : "test1";
var N = argv.length > 2 ? parseInt(argv[2]) : 0;
var dolast=0; if (N<0){N=-N; dolast=1;}
var args=[3];// additional arguments
args[0]=argv.length > 3 ? argv[3] : -1; 
args[1]=argv.length > 4 ? argv[4] : -1;
args[2]=argv.length > 5 ? argv[5] : -1; 
//context.checkArgs(1, -1, "[pattern] [iterations] [arg1] [arg2] [arg3]");
//
// Set selection region coords (real minecraft units, edges are integers)
var sel={}; 
sel.sx=region.getWidth();  sel.x=region.getMinimumPoint().getX()+sel.sx/2; 
sel.sy=region.getHeight(); sel.y=region.getMinimumPoint().getY()+sel.sy/2; 
sel.sz=region.getLength(); sel.z=region.getMinimumPoint().getZ()+sel.sz/2; 
sel.vxx=1; sel.vxy=0; sel.vxz=0;
sel.vyx=0; sel.vyy=1; sel.vyz=0;
sel.vzx=0; sel.vzy=0; sel.vzz=1;
// 
// get current player position relative to selection region
var play={};
var vec = player.getBlockIn();
play.x=vec.getX()-sel.x;
play.y=vec.getY()-sel.y;
play.z=vec.getZ()-sel.z;
//
// Define parents coords
var prt={}; 
prt.x=[]; prt.y=[]; prt.z=[];//center
prt.sx=[]; prt.sy=[]; prt.sz=[];//scales
prt.vxx=[]; prt.vxy=[]; prt.vxz=[]; //(rotated) unity vectors of x-y-z axis
prt.vyx=[]; prt.vyy=[]; prt.vyz=[];
prt.vzx=[]; prt.vzy=[]; prt.vzz=[];
//
// Set first parent coords
prt.x[0]=sel.x; prt.y[0]=sel.y; prt.z[0]=sel.z;
prt.sx[0]=sel.sx; prt.sy[0]=sel.sy; prt.sz[0]=sel.sz;
prt.vxx[0]=sel.vxx; prt.vxy[0]=sel.vxy; prt.vxz[0]=sel.vxz;
prt.vyx[0]=sel.vyx; prt.vyy[0]=sel.vyy; prt.vyz[0]=sel.vyz;
prt.vzx[0]=sel.vzx; prt.vzy[0]=sel.vzy; prt.vzz[0]=sel.vzz;
//
// Define all-purpose coords and others
var pc={}; var plen; var jlen; var mat={};
//
// Loop on iterations
for (var n = 0; n <= N; n++) {
player.print('iteration:'+ n +'/'+ N);
//
//
// Loop over each parent
plen=prt.x.length;
for (var p = 0;  p < plen; p++) {
// Get parent region
pc.x=prt.x[p]; pc.y=prt.y[p]; pc.z=prt.z[p];
pc.sx=prt.sx[p]; pc.sy=prt.sy[p]; pc.sz=prt.sz[p];
pc.vxx=prt.vxx[p]; pc.vxy=prt.vxy[p]; pc.vxz=prt.vxz[p];
pc.vyx=prt.vyx[p]; pc.vyy=prt.vyy[p]; pc.vyz=prt.vyz[p];
pc.vzx=prt.vzx[p]; pc.vzy=prt.vzy[p]; pc.vzz=prt.vzz[p];
//
//Get pattern of builds and childs regions
mat=getbuildsandchilds(pattern,n,N,p,pc,play,args);
//
// Do parent builds
if ( dolast==0 || n==N) {
jlen=mat.x.length;
for (var j = 0; j < jlen; j++) {
buildone(mat,j,pc,sel); }}//
//
}//p
//
// Update all parents into their childs
prt=parentstochilds(prt,mat);
//
}//loop n
//
// Done
player.print('----- done -----');
//var time2 = new Date();player.print(time2-time1)//execution time for debug
//
//////////////////////////////////////
// Function update parents into childs
function parentstochilds(prt,mat) {
var a=[3]; var rmatx; var rmaty; var rmatz;
var pcx; var pcy; var pcz;
var pcsx; var pcst; var pcsz;
var pcvxx; var pcvxy; var pcvxz;
var pcvyx; var pcvyy; var pcvyz;
var pcvzx; var pcvzy; var pcvzz;
var cp=0; var klen= mat.cx.length; var plen=prt.x.length;
// Define childs coords
var chd={}; 
chd.x=[]; chd.y=[]; chd.z=[];
chd.sx=[]; chd.sy=[]; chd.sz=[];
chd.vxx=[]; chd.vxy=[]; chd.vxz=[];
chd.vyx=[]; chd.vyy=[]; chd.vyz=[];
chd.vzx=[]; chd.vzy=[]; chd.vzz=[];
// Loop over each parent
for (var p = 0; p < plen; p++) {
// Get parent region
pcx=prt.x[p]; pcy=prt.y[p]; pcz=prt.z[p];
pcsx=prt.sx[p]; pcsy=prt.sy[p]; pcsz=prt.sz[p];
pcvxx=prt.vxx[p]; pcvxy=prt.vxy[p]; pcvxz=prt.vxz[p];
pcvyx=prt.vyx[p]; pcvyy=prt.vyy[p]; pcvyz=prt.vyz[p];
pcvzx=prt.vzx[p]; pcvzy=prt.vzy[p]; pcvzz=prt.vzz[p];
// Do one parent childs 
for (var k = 0; k < klen; k++) { 
chd.sx[cp]=pcsx*mat.csx[k]; chd.sy[cp]=pcsy*mat.csy[k]; chd.sz[cp]=pcsz*mat.csz[k];
chd.x[cp]=mat.cx[k]*pcsx*pcvxx+mat.cy[k]*pcsy*pcvyx+mat.cz[k]*pcsz*pcvzx +pcx;
chd.y[cp]=mat.cx[k]*pcsx*pcvxy+mat.cy[k]*pcsy*pcvyy+mat.cz[k]*pcsz*pcvzy +pcy;
chd.z[cp]=mat.cx[k]*pcsx*pcvxz+mat.cy[k]*pcsy*pcvyz+mat.cz[k]*pcsz*pcvzz +pcz;
rmatx=matrot(pcvxx,pcvxy,pcvxz,mat.crx[k]);
rmaty=matrot(pcvyx,pcvyy,pcvyz,mat.cry[k]);
rmatz=matrot(pcvzx,pcvzy,pcvzz,mat.crz[k]);
a=vrot3(pcvxx,pcvxy,pcvxz,rmatx,rmaty,rmatz);
chd.vxx[cp]=a[0]; chd.vxy[cp]=a[1]; chd.vxz[cp]=a[2];
a=vrot3(pcvyx,pcvyy,pcvyz,rmatx,rmaty,rmatz);
chd.vyx[cp]=a[0]; chd.vyy[cp]=a[1]; chd.vyz[cp]=a[2];
a=vrot3(pcvzx,pcvzy,pcvzz,rmatx,rmaty,rmatz);
chd.vzx[cp]=a[0]; chd.vzy[cp]=a[1]; chd.vzz[cp]=a[2];
cp=cp+1;}//k
}// p
//Return all childs (to become parents)
return chd;
} 
//////////////////////////////////////
// Function do one build
function buildone(mat,j,pc,sel) {
var a=[3]; var blockuse; var dobuild1; var dobuild2; var isign;
var xr; var yr; var zr; var llen;
// Read all that is needed
var selx=sel.x; var sely=sel.y; var selz=sel.z;
var selsx=sel.sx; var selsy=sel.sy; var selsz=sel.sz;
var sx=pc.sx*mat.sx[j]; var sy=pc.sy*mat.sy[j]; var sz=pc.sz*mat.sz[j]; 
var x=mat.x[j]*pc.sx*pc.vxx+mat.y[j]*pc.sy*pc.vyx+mat.z[j]*pc.sz*pc.vzx +pc.x;
var y=mat.x[j]*pc.sx*pc.vxy+mat.y[j]*pc.sy*pc.vyy+mat.z[j]*pc.sz*pc.vzy +pc.y;
var z=mat.x[j]*pc.sx*pc.vxz+mat.y[j]*pc.sy*pc.vyz+mat.z[j]*pc.sz*pc.vzz +pc.z;
var rmatx=matrot(pc.vxx,pc.vxy,pc.vxz,mat.rx[j]);
var rmaty=matrot(pc.vyx,pc.vyy,pc.vyz,mat.ry[j]);
var rmatz=matrot(pc.vzx,pc.vzy,pc.vzz,mat.rz[j]);
var vx={}; var vy={}; var vz={};
a=vrot3(pc.vxx,pc.vxy,pc.vxz,rmatx,rmaty,rmatz);
vx.x=a[0]; vx.y=a[1]; vx.z=a[2];
a=vrot3(pc.vyx,pc.vyy,pc.vyz,rmatx,rmaty,rmatz);
vy.x=a[0]; vy.y=a[1]; vy.z=a[2];
a=vrot3(pc.vzx,pc.vzy,pc.vzz,rmatx,rmaty,rmatz);
vz.x=a[0]; vz.y=a[1]; vz.z=a[2];
// Get build specifics
var matbexp=mat.bexp[j];
var matbfrc=mat.bfrc[j];
var matbid=mat.bid[j]; 
var matbdat=mat.bdat[j];
var matofrc=mat.ofrc[j];
var matoid=mat.oid[j]; 
var matodat=mat.odat[j];
//
// Get max ranges where could build (real units, lower edges)
rge=getmaxrange(x,y,z,vx,vy,vz,sx,sy,sz);
//Loop over each block lower edge, within max ranges
for (var ix = rge.xmin; ix <= rge.xmax; ix++) {
for (var iy = rge.ymin; iy <= rge.ymax; iy++) {
for (var iz = rge.zmin; iz <= rge.zmax; iz++) {
// Compare coords of block center to initial cuboid selection
// (xr,yr,zr are real coords of block to read)
xr=scalpro(ix+0.5-x,iy+0.5-y,iz+0.5-z,vx.x,vx.y,vx.z)/sx*selsx+selx;
yr=scalpro(ix+0.5-x,iy+0.5-y,iz+0.5-z,vy.x,vy.y,vy.z)/sy*selsy+sely;
zr=scalpro(ix+0.5-x,iy+0.5-y,iz+0.5-z,vz.x,vz.y,vz.z)/sz*selsz+selz;
// Check if must build the block
dobuild1=checkbuild((xr-selx)/selsx*2,(yr-sely)/selsy*2,(zr-selz)/selsz*2,sx,sy,sz,matbexp);
// Build the block (maybe)
if (dobuild1===1) {
//
// Determine block type to read
switch (matbfrc) {
case 0:
// Simply copied  
dobuild2=1;
blockuse=readablock(xr,yr,zr,selx,sely,selz,selsx,selsy,selsz);
break;
case 1:
// Filled with one block type
dobuild2=1;
blockuse=BaseBlock(matbid,matbdat);
break;
case 2:
// Copied with exclusions
dobuild2=1;
blockuse=readablock(xr,yr,zr,selx,sely,selz,selsx,selsy,selsz);
llen=matbid.length;
for (var l = 0; l <= llen; l++) {
if (blockuse.id===matbid[l] && blockuse.data===matbdat[l]) {
dobuild2=0;}}
break;
case 3:
// Copied with inclusions
dobuild2=0;
blockuse=readablock(xr,yr,zr,selx,sely,selz,selsx,selsy,selsz);
llen=matbid.length;
for (var l = 0; l <= llen; l++) {
if (blockuse.id===matbid[l] && blockuse.data===matbdat[l]) {
dobuild2=1;}}
break;
} 
// Determine block to write
switch (matofrc) {
//case 0: //copy
case 2:
//write with exclusions
var vec = new Vector(ix,iy,iz); var blockout=blocks.getBlock(vec);
llen=matoid.length;
for (var l = 0; l <= llen; l++) {
if (blockout.id===matoid[l] && blockout.data===matodat[l]) {
dobuild2=0;}}
break;
case 3:
//write with inclusions
var vec = new Vector(ix,iy,iz); var blockout=blocks.getBlock(vec);
dobuild2=0;
llen=matoid.length;
for (var l = 0; l <= llen; l++) {
if (blockout.id===matoid[l] && blockout.data===matodat[l]) {
dobuild2=1;}}
}
//
// Build in world
if (dobuild2===1) {
var vec = new Vector(ix,iy,iz); 
blocks.setBlock(vec, blockuse); 
}//dobuild2
}// dobuild1
}}}// ix,iy,iz
}//buildone
//
//////////////////////////////////////
// Function get sign of something
function sign(hx) { 
return hx ? hx < 0 ? -1 : 1 : 0;
}
//////////////////////////////////////
// Function test is something is an integer
function isint(hx) {
return hx % 1 === 0;
}
//////////////////////////////////////
// Function check if must build 
function checkbuild(x,y,z,wx,wy,wz,expression) {
var dobuild=0;
// New variables x-y-z for expression are from -1 to 1 inside selection cuboid
// by default abs(x)<=1, abs(y=)<1, abs(z=)<1 is always verified
// also the cuboid size must be greater than around 1x1x1
if (Math.abs(x)<=1) {// be inside 
if (Math.abs(y)<=1) {
if (Math.abs(z)<=1) {
if (wx+wy+wz>=3) {// do not be too small
if (expression===0) {dobuild=1;} 
else {if (eval(expression)) {dobuild=1;}}
}//not small
}}}// be inside
return dobuild;
}
//////////////////////////////////////
// Function read a block in world
function readablock(xr,yr,zr,selx,sely,selz,selsx,selsy,selsz) {
// Copied from initial selection
// Rules for rounding positions: the block center is compared inside initial selection
// If exactly on an edge read more inside/outside
var isign=-1;//-1 reads inside, 1 reads outside
if (isint(xr)===1)   {xr=xr+isign*0.5*sign(xr-selx);}
if (isint(yr)===1)   {yr=yr+isign*0.5*sign(yr-sely);}
if (isint(zr)===1)   {zr=zr+isign*0.5*sign(zr-selz);}
// If out of selection border edge read inside
if (xr>=selx+selsx/2) {xr=selx+selsx/2-0.5;}
if (xr<=selx-selsx/2) {xr=selx-selsx/2+0.5;}
if (yr>=sely+selsy/2) {yr=sely+selsy/2-0.5;}
if (yr<=sely-selsy/2) {yr=sely-selsy/2+0.5;}
if (zr>=selz+selsz/2) {zr=selz+selsz/2-0.5;}
if (zr<=selz-selsz/2) {zr=selz-selsz/2+0.5;}
// Some last exceptions remain if exactly on x-y-z center axis of selection
xr=Math.floor(xr);
yr=Math.floor(yr);
zr=Math.floor(zr);
 //Read block (note smx,smy,smz are a trick to modify reading position)
var vec = new Vector(xr,yr,zr);
blockuse = blocks.getBlock(vec);   
return blockuse;
}
//////////////////////////////////////
// Function compute rotation matrix of ang around normalised axis=ax ay az
function matrot(ax,ay,az,ang) {
var rmat=[3]; rmat[0]=[3]; rmat[1]=[3]; rmat[2]=[3];
var c=Math.cos(ang); var s=Math.sin(ang);
rmat[0][0]=ax*ax+(1-ax*ax)*c; rmat[0][1]=ax*ay*(1-c)-az*s;  rmat[0][2]=ax*az*(1-c)+ay*s;
rmat[1][0]=ax*ay*(1-c)+az*s;  rmat[1][1]=ay*ay+(1-ay*ay)*c; rmat[1][2]=ay*az*(1-c)-ax*s;
rmat[2][0]=ax*az*(1-c)-ay*s;  rmat[2][1]=ay*az*(1-c)+ax*s;  rmat[2][2]=az*az+(1-az*az)*c;
return rmat;
}
//////////////////////////////////////
// Function rotate vector mx,my,mz from rotation matrix
function vrot(mx,my,mz,rmat) {
var ja=[3]
ja[0]=rmat[0][0]*mx + rmat[0][1]*my + rmat[0][2]*mz;
ja[1]=rmat[1][0]*mx + rmat[1][1]*my + rmat[1][2]*mz;
ja[2]=rmat[2][0]*mx + rmat[2][1]*my + rmat[2][2]*mz;
return ja;
}
//////////////////////////////////////
// Function rotate vector 3 times
// Rotation order is over axis X then Y then Z (non invertible)
function vrot3(mx,my,mz,rmatx,rmaty,rmatz) {
var a=[3]; a[0]=mx; a[1]=my; a[2]=mz;
a=vrot(a[0],a[1],a[2],rmatx);
a=vrot(a[0],a[1],a[2],rmaty);
a=vrot(a[0],a[1],a[2],rmatz);
return a;
}
//////////////////////////////////////
// Function scalar product
function scalpro(mx,my,mz,hx,hy,hz) {
var a=mx*hx+my*hy+mz*hz;
return a;
}
//////////////////////////////////////
// Function get max range of a rotated cuboid (real units, rounded)
function getmaxrange(x,y,z,vx,vy,vz,sx,sy,sz) {
var rge={}; var v={}; v.x=[8]; v.y=[8]; v.z=[8]; 
// Get all vertices positions
v.x[0]=sx/2*vx.x+sy/2*vy.x+sz/2*vz.x+x;  v.y[0]=sx/2*vx.y+sy/2*vy.y+sz/2*vz.y+y;  v.z[0]=sx/2*vx.z+sy/2*vy.z+sz/2*vz.z+z;
v.x[1]=sx/2*vx.x+sy/2*vy.x-sz/2*vz.x+x;  v.y[1]=sx/2*vx.y+sy/2*vy.y-sz/2*vz.y+y;  v.z[1]=sx/2*vx.z+sy/2*vy.z-sz/2*vz.z+z;
v.x[2]=sx/2*vx.x-sy/2*vy.x+sz/2*vz.x+x;  v.y[2]=sx/2*vx.y-sy/2*vy.y+sz/2*vz.y+y;  v.z[2]=sx/2*vx.z-sy/2*vy.z+sz/2*vz.z+z;
v.x[3]=sx/2*vx.x-sy/2*vy.x-sz/2*vz.x+x;  v.y[3]=sx/2*vx.y-sy/2*vy.y-sz/2*vz.y+y;  v.z[3]=sx/2*vx.z-sy/2*vy.z-sz/2*vz.z+z;
v.x[4]=-sx/2*vx.x+sy/2*vy.x+sz/2*vz.x+x; v.y[4]=-sx/2*vx.y+sy/2*vy.y+sz/2*vz.y+y; v.z[4]=-sx/2*vx.z+sy/2*vy.z+sz/2*vz.z+z;
v.x[5]=-sx/2*vx.x+sy/2*vy.x-sz/2*vz.x+x; v.y[5]=-sx/2*vx.y+sy/2*vy.y-sz/2*vz.y+y; v.z[5]=-sx/2*vx.z+sy/2*vy.z-sz/2*vz.z+z;
v.x[6]=-sx/2*vx.x-sy/2*vy.x+sz/2*vz.x+x; v.y[6]=-sx/2*vx.y-sy/2*vy.y+sz/2*vz.y+y; v.z[6]=-sx/2*vx.z-sy/2*vy.z+sz/2*vz.z+z;
v.x[7]=-sx/2*vx.x-sy/2*vy.x-sz/2*vz.x+x; v.y[7]=-sx/2*vx.y-sy/2*vy.y-sz/2*vz.y+y; v.z[7]=-sx/2*vx.z-sy/2*vy.z-sz/2*vz.z+z;
// Get max ranges from all vertices
rge.xmin=Math.min(v.x[0],v.x[1],v.x[2],v.x[3],v.x[4],v.x[5],v.x[6],v.x[7]);
rge.xmax=Math.max(v.x[0],v.x[1],v.x[2],v.x[3],v.x[4],v.x[5],v.x[6],v.x[7]);
rge.ymin=Math.min(v.y[0],v.y[1],v.y[2],v.y[3],v.y[4],v.y[5],v.y[6],v.y[7]);
rge.ymax=Math.max(v.y[0],v.y[1],v.y[2],v.y[3],v.y[4],v.y[5],v.y[6],v.y[7]);
rge.zmin=Math.min(v.z[0],v.z[1],v.z[2],v.z[3],v.z[4],v.z[5],v.z[6],v.z[7]);
rge.zmax=Math.max(v.z[0],v.z[1],v.z[2],v.z[3],v.z[4],v.z[5],v.z[6],v.z[7]);
// Convert max range to lower edges
rge.xmin=Math.floor(rge.xmin);
rge.ymin=Math.floor(rge.ymin);
rge.zmin=Math.floor(rge.zmin);
rge.xmax=Math.floor(rge.xmax);
rge.ymax=Math.floor(rge.ymax);
rge.zmax=Math.floor(rge.zmax);
return rge; 
}
////////////////////////////////////// 
// Function: define pattern of builds and childs
function getbuildsandchilds(pattern,n,N,p,pc,play,args) {
// Parent region infos
var px=play.x; var py=play.y; var pz=play.z;
var sx=pc.sx; var sy=pc.sy; var sz=pc.sz;
// note could also use the pc.x, pc.vx and others....
// Initialisation
var t=[3]; var r=[3]; var s=[3];
var j=0; var k=0; var li=0; var lo=0; var mat={};  
mat.x=[]; mat.y=[]; mat.z=[];// builds
mat.rx=[]; mat.ry=[]; mat.rz=[];//(must keep)
mat.sx=[]; mat.sy=[]; mat.sz=[];
mat.cx=[]; mat.cy=[]; mat.cz=[];// childs
mat.crx=[]; mat.cry=[]; mat.crz=[];//(must keep)
mat.csx=[]; mat.csy=[]; mat.csz=[];
mat.bexp=[];//filter with x-y-z expression
mat.bfrc=[]; mat.bid=[]; mat.bdat=[];  //input block filters
mat.ofrc=[]; mat.oid=[]; mat.odat=[];//output block filters
//
// Function reinitialise all
function addref(){
t=[0,0,0]; r=[0,0,0]; s=[1,1,1]; 
} 
// Function record build
function addbuild(){
mat.x[j]=t[0]/pc.sx; mat.y[j]=t[1]/pc.sy; mat.z[j]=t[2]/pc.sz; 
mat.rx[j]=r[0]*Math.PI/180; 
mat.ry[j]=r[1]*Math.PI/180; 
mat.rz[j]=r[2]*Math.PI/180; 
mat.sx[j]=s[0]; mat.sy[j]=s[1]; mat.sz[j]=s[2];
mat.bexp[j]=0; mat.bfrc[j]=0; mat.ofrc[j]=0;
j=j+1; li=0; lo=0;
}
// Function record child
function addchild(){
mat.cx[k]=t[0]/pc.sx; mat.cy[k]=t[1]/pc.sy; mat.cz[k]=t[2]/pc.sz; 
mat.crx[k]=r[0]*Math.PI/180;
mat.cry[k]=r[1]*Math.PI/180; 
mat.crz[k]=r[2]*Math.PI/180; 
mat.csx[k]=s[0]; mat.csy[k]=s[1]; mat.csz[k]=s[2];
k=k+1;
}
// Function force blocktype of last recorded build
function addfill(blockid,blockdata){
if (j>0){mat.bfrc[j-1]=1; mat.bid[j-1]=blockid; mat.bdat[j-1]=blockdata;
}}
// Function exclude blocktype (input) in last recorded build
// those blocktypes will not be read when copying 
function addexcin(blockid,blockdata){
if (j>0){
mat.bfrc[j-1]=2; 
if (li==0) {mat.bid[j-1]=[]; mat.bdat[j-1]=[];}
mat.bid[j-1][li]=blockid; mat.bdat[j-1][li]=blockdata;
li=li+1; //total number of exclude in
}}
// Function include blocktype (input) in last recorded build
// only those blocktypes will be read when copying 
function addincin(blockid,blockdata){
if (j>0){
mat.bfrc[j-1]=3; 
if (li==0) {mat.bid[j-1]=[]; mat.bdat[j-1]=[];}
mat.bid[j-1][li]=blockid; mat.bdat[j-1][li]=blockdata;
li=li+1; //total number of include in
}}
// Function exclude blocktype (output) in last recorded build
// those blocktypes will not be overwritten when copying
function addexcout(blockid,blockdata){
if (j>0){
mat.ofrc[j-1]=2; 
if (lo==0) {mat.oid[j-1]=[]; mat.odat[j-1]=[];}
mat.oid[j-1][lo]=blockid; mat.odat[j-1][lo]=blockdata;
lo=lo+1; //total number of exclude out 
}}
// Function include blocktype (output) in last recorded build
// only those blocktypes will be overwritten when copying
function addincout(blockid,blockdata){
if (j>0){
mat.ofrc[j-1]=3; 
if (lo==0) {mat.oid[j-1]=[]; mat.odat[j-1]=[];}
mat.oid[j-1][lo]=blockid; mat.odat[j-1][lo]=blockdata;
lo=lo+1; //total number of include out 
}}
// Function add mathematical expression
function addmath(expression){
if (j>0){mat.bexp[j-1]=expression;
}}
// Function get an optional input argument (numbered from 1), 
function getarg(argnum){
var argument=args[argnum-1];//returns -1 if no input
return argument;  
}
// Function add fill type directly from input argument (faster than getarg, addfill)
// if there is no input argument it will not add fill type
function addfillarg(argnum) {
var bfill=getarg(argnum); 
if (bfill!=-1) {
bfill=context.getBlock(bfill); 
addfill(bfill.id,bfill.data);}
}
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
// README: Patterns
// 
// 1.) Choose a new pattern name (e.g. "mypattern") 
//     add your script: if (pattern="mypattern") {...}
//
// 2.) Define new regions: 
//     New regions are defined with respect to the parent region
//     use the (t,s,r) coordinate system (see the examples provided)
//    
// 2.a) t,s,r coordinate system:
//      The parent region is a cuboid, and (t,s,r) defines a new cuboid region
//      The minecraft x-y-z axis point east-up-south
//      At first iteration=0, the parent region is the WorldEdit cuboid selection
//      t translates the new region, s scales the new region, r rotates the new region
//      t=[0,0,0], s=[1,1,1], r=[0,0,0] makes the new region exactly the parent region
//      t=[1,0,0] moves the new region one block east, t=[0,1,0] one up, t=[0,0,1] one south
//      s=[2,1,1] scales 2x in east-west direction, s=[1,2,1] up/down, s=[1,1,2] south/north 
//      r=[90,0,0] rotates 90 deg counterclockwise along x, r=[0,90,0] along y, r=[0,0,90] along z
//      addref() reinitiates t,s and r to t=[0,0,0], s=[1,1,1], r=[0,0,0]
//
// 3.) Define new builds regions:
// those are cuboids build at each iteration
// They are either a copy of initial selection, or filled with one block type (cf user input arguments)
// after defining a new region (t,s,r), addbuild() records it into a new build
//
// 4.) Define new Child regions: 
// those are cuboids. They sirve for the fractal iteration system (with parents and childs)
// At each iteration 1<=n<=N, the childs regions become the parents regions
// after defining a new region (t,s,r), addchild() records it into a new child
// At the next iteration, the builds will be made again, but in the frame of the child regions
// For example if the childs axis are rotated, the t,s,r at next iteration will be along those rotated axis
//   
// 5.) Define blocktype filters for builds (optional):
// after addbuild(), you can add blocktype filters for the last recorded build
// those modify the blocktype, regardless of user input arguments
// after one build, you can add only one addfill, but several addexcin, addexcout, addincin,addincout
// for one build you have to choose between addfill,addexcin,addincin and between addexcout,addincout (do not mix !)
// - addfill(blockid, blockdata) fills build entirely with that blocktype
// for example addfill(1,0) fills with stone
// - addexcin(blockid, blockdata) prevents to read that blocktype when copying 
// Typically addexcin(0,0) prevents from copying blocks of air
// - addexcout(blockid,blockdata) prevents tto overwrite that blocktype
// Typically addexcout(56,0) prevents from overwritting diamond ore
// -addincin(blockid, blockdata) only reads that blocktype when copying 
// -addincout(blockid, blockdata) only overwrites that blocktype when copying 
//
// 6.) Define math expression for build (optionnal)
//  after addbuild(), can can filter construction with a math expression that must be true
//  addmath("x*x+z*z<=1") for example copies/fills a cylinder (instead of the cuboid)
//  those are with x-y-z the coordinate inside your cube that are each from -1 to 1 (as in //generate)
// you must use javascript maths in the expression (Math.abs, Math.pow...) and ONLY x,y,z ! 
//  Note that the expression "Math.abs(x)<=1 && Math.abs(y)<=1 and %% Math.abs(z)<=1" 
// that defines the cuboid is always checked
// 
// 7.) you can read and use additional input arguments
//    in the calling sequence /cs fracraft pattern iterations arg1 arg2 arg3...
//    arg1, arg2 and beyond are optionnal but can be provided by the user
//    - getarg(1) reads the input argument arg1 ( if they are no input arguments it returns -1)
//    -getfillarg(1) is a shortcut, it puts an addfill using arg1=sandstone, wool:red or others
// 
// 8.) For more complex builds/childs, the following are provided: 
//     px,py,pz are the player position with respect to the initial selection center
//     sx,sy,sz are the scales(extension) of the current parent region
//     n is the current iteration (starting from 0)
//     p is the current parent (starting from 0)
//     N is the total number of iterations
//     do not change those values, nor change j,k,li,lo that are reserved
//
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//
/////////////////////////////////////
// Test with the t,s,r system, making a simple build
// /cs fracraft test1
// try to comment/uncomment each line 
if (pattern=="test1") {
// Make a build with t,s,r
addref(); // reinitialise t,s and r
//t=[1,0,0];//move build east one block
t=[0,sy,0];//move build up 1x the selection height
//t=[-2,0,0];//move build west 2 blocks
//t=[0,1,0];//move build up 1 block
//t=[0,sy,0];//move build up 1x the selection y-height
//t=[0,0,2*sz];//move build south 2x the selection z-length
//s=[2,1,1];// scale build 2x in east-west direction
//s=[1,0.5,1];// scale build 0.5x in up-down direction
//s=[1,1,3];// scale build 3x in north-south direction
//s=[(sx-2)/sx,1,1];// contracts size 2 blocks in east-west direction
//s=[(sx+2)/sx,1,1];// expands size 2 blocks in east-west direction
//s=[(sx-2)/sx,1,1];// contracts size 2 blocks in east-west direction
//s=[1,1/sy,1];// scale build 0 to be one block in up-down direction
//r=[90,0,0];// rotate child 90 deg counterclockwise among x-axis
//r=[0,45,0];// rotate child 45 deg among y-axis
//r=[0,0,-30];// rotate child -30 deg among z-axis
addbuild();// record (t,s,r) as a build
//... here can repeat the process to make another build
}

/////////////////////////////////////
// Test with the t,s,r system, making a simple child
// /cs fracraft test2 3
// try to comment/uncomment each line 
if (pattern=="test2") {
// Make a child with t,s,r
addref(); // reinitialise t,s and r to no changes
t=[2,0,0];//move child east 2 blocks
//s=[2,1,1];// scale child 2x in east-west direction
//r=[0,45,0];// rotate child 45 deg among y-axis
addchild(); // record as a child
//... here can repeat the process to make another child
addref(); addbuild();// we add a build that will move in the childs frame
}
/////////////////////////////////////
// Test with the t,s,r system, making complex builds
// /cs fracraft test3 
// try to comment/uncomment each line 
if (pattern=="test3") {
// Make a build with t,s,r
addref(); // reinitialise t,s and r
t=[1,0,0];//move build east one block
addbuild();
// Modify the properties of this build
//addfill(1,0); // force the build to be always filled with stone
//addexcin(0,0); addexcin(35,14); // force the build to never read air nor wool:red
//addincin(1,0); addincin(35,0); // force the build to only read stone and wool
//addexcout(1,0); addexcout(35,0);// force the build to never write over stone and wool
//addincout(1,0); addincout(35,0);// force the build to only write over stone and wool
//addmath("Math.pow(x,2)+Math.pow(y,2)+Math.pow(z,2)>=1"); // build only where expression is true
// Use arguments
//var arg1=getarg(1); // this gives you arg1
//addfillarg(1); //arg1 is used directly to do addfill()
}
/////////////////////////////////////
// copy your house to the east at twice the scale: DO NOT ITERATE MUCH ! 
if (pattern=="biggerhouse") {
addref(); t=[sx*1.5+2,sy/2,-sz/2]; s=[2,2,2]; 
addbuild(); addchild();
}
/////////////////////////////////////
// copies at 45 deg (best is to select a flat village area)
// do iteration by iteration,= -1, =-2, =-3 ...
if (pattern=="inception") {
var term=Math.sqrt(2);
addref(); addbuild(); addexcin(0,0); //do not copy air
//addref(); t=[sx/2+sx/2/term,sx/2/term,0]; s=[1,1,1]; r=[0,0,45]; addchild(); //edges touch
addref(); t=[sx/2+sx/2/term-sy/2/term,sx/2/term+sy/2/term-sy/2,0]; s=[1,1,1]; r=[0,0,45]; addchild(); //vertices touch
}
/////////////////////////////////////
// The pythagore tree in 2D
// Best is from a 32x32x1 selection
if (pattern=="pytree2d") {
addref(); addbuild(); addfillarg(1); 
var term=1/Math.sqrt(2);
addref(); s=[term,term,1]; t=[sx/2,sy,0];  r=[0,0,-45]; addchild(); 
addref(); s=[term,term,1]; t=[-sx/2,sy,0]; r=[0,0,45]; addchild(); 
}
/////////////////////////////////////
// A modified pythagore tree in 3D
// Best is from a 32x32x32 selection
if (pattern=="pytree3d") {
var doit=1; //default, build all
//doit=isint(p/2);//optionnal, build only if even parent
//doit=isint((p+1)/2);//optionnal, build only if odd parent
//doit=isint( p/4);//optionnal, build only if parent modulo 4
//doit=isint( (p+1)/4);//optionnal, build only if parent 1+modulo 4
//doit=isint( (p+2)/4);//optionnal, build only if parent 2+modulo 4
//doit=isint( (p+3)/4);//optionnal, build only if parent 3+modulo 4
if (doit==1) {addref(); addbuild(); addfillarg(1);}
var term=1/Math.sqrt(2);
addref(); s=[term,term,term]; t=[sx/2,sy,0];  r=[0,90,-45]; addchild(); 
//addref(); s=[term,term,term]; t=[0,sy,sz/2];  r=[45,0,0]; addchild();//optionnal build 
addref(); s=[term,term,term]; t=[-sx/2,sy,0]; r=[0,90,45]; addchild(); 
//addref(); s=[term,term,term]; t=[0,sy,-sz/2]; r=[-45,0,0]; addchild();//optionnal build 
}
/////////////////////////////////////
// A fractal cube
// Make a 32x32x32 selection (nicer)
//  /cs fracraft fcube 4
// or: /cs fracraft fcube 0 stone, /cs fracraft fcube -1 obsidian, etc... to change colors
if (pattern=="fcube") {
addref(); addbuild(); // initial cube fill
addfillarg(1); // if arg1 is set it gives a blocktype to fill with (if not it copies)
addref(); s=[1/2,1/2,1/2]; t=[sx*3/4,-sy*1/4,-sz*1/4]; addchild(); //east
addref(); s=[1/2,1/2,1/2]; t=[-sx*3/4,sy*1/4,sz*1/4]; addchild(); //west
addref(); s=[1/2,1/2,1/2]; t=[-sx*1/4,-sy*1/4,sz*3/4]; addchild(); //south
addref(); s=[1/2,1/2,1/2]; t=[sx*1/4,sy*1/4,-sz*3/4]; addchild(); //north
addref(); s=[1/2,1/2,1/2]; t=[-sx*1/4,sy*3/4,-sz*1/4]; addchild(); //up
addref(); s=[1/2,1/2,1/2]; t=[sx*1/4,-sy*3/4,sz*1/4]; addchild(); //down
}
// Empty the inside of fcube (use with air AFTER fcube with 4 iterations)
if (pattern=="fcubeinside") {
addref(); s=[(sx-2)/sx,(sy-2)/sy,(sz-2)/sz]; addbuild(); addfill(0,0); //fill with air
addref(); s=[2/sx,(sy/2-2)/sy,(sz/2-2)/sz]; t=[sx*1/2,-sy*1/4,-sz*1/4]; addbuild(); addfill(0,0);//doors
addref(); s=[2/sx,(sy/2-2)/sy,(sz/2-2)/sz]; t=[-sx*1/2,sy*1/4,sz*1/4]; addbuild(); addfill(0,0);
addref(); s=[(sx/2-2)/sx,(sy/2-2)/sy,2/sz]; t=[-sx*1/4,-sy*1/4,sz*1/2]; addbuild();addfill(0,0); //south
addref(); s=[(sx/2-2)/sx,(sy/2-2)/sy,2/sz]; t=[sx*1/4,sy*1/4,-sz*1/2]; addbuild(); addfill(0,0);//north
addref(); s=[(sx/2-2)/sx,2/sy,(sz/2-2)/sz]; t=[-sx*1/4,sy*1/2,-sz*1/4]; addbuild(); addfill(0,0);//up
addref(); s=[(sx/2-2)/sx,2/sy,(sz/2-2)/sz]; t=[sx*1/4,-sy*1/2,sz*1/4]; addbuild(); addfill(0,0);//down
addref(); s=[1/2,1/2,1/2]; t=[sx*3/4,-sy*1/4,-sz*1/4]; addchild(); //childs
addref(); s=[1/2,1/2,1/2]; t=[-sx*3/4,sy*1/4,sz*1/4]; addchild(); //west
addref(); s=[1/2,1/2,1/2]; t=[-sx*1/4,-sy*1/4,sz*3/4]; addchild(); //south
addref(); s=[1/2,1/2,1/2]; t=[sx*1/4,sy*1/4,-sz*3/4]; addchild(); //north
addref(); s=[1/2,1/2,1/2]; t=[-sx*1/4,sy*3/4,-sz*1/4]; addchild(); //up
addref(); s=[1/2,1/2,1/2]; t=[sx*1/4,-sy*3/4,sz*1/4]; addchild(); //down
}
/////////////////////////////////////
// The spongecube
// make a 27x27x27 selection (nicer), fill it entirely, then run
if (pattern=="spongecube") {
addref(); s=[1/3,1/3,1/3]; addbuild(); addfill(0,0); //fill with air
addref(); s=[1/3,1/3,1/3]; t=[sx/3,0,0]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,0,0]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[0,sy/3,0]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[0,-sy/3,0]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[0,0,sz/3]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[0,0,-sz/3]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[0,sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,-sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,sy/3,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,-sy/3,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,sy/3,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,-sy/3,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,-sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,0,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,0,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,sy/3,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,-sy/3,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,sy/3,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,-sy/3,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,-sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,0,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,0,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,sy/3,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,-sy/3,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,sy/3,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,-sy/3,-sz/3]; addchild();
}
// The snowflake spongecube
// make a 27x27x27 selection (nicer), fill it entirely, then run
if (pattern=="snowflakecube") {
addref(); s=[1/3,1/3,1/3]; addbuild(); addfill(0,0);// center (is optionnal)
addref(); s=[1/3,1/3,1/3]; t=[sx/3,sy/3,sz/3]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[sx/3,sy/3,-sz/3]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[sx/3,-sy/3,sz/3]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[sx/3,-sy/3,-sz/3]; addbuild();addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,sy/3,sz/3]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,sy/3,-sz/3]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,-sy/3,sz/3]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,-sy/3,-sz/3]; addbuild(); addfill(0,0);
addref(); s=[1/3,1/3,1/3]; addchild(); // childs center
addref(); s=[1/3,1/3,1/3]; t=[sx/3,0,0]; addchild();// childs middles
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,0,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,-sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,0,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,0,-sz/3]; addchild()
addref(); s=[1/3,1/3,1/3]; t=[sx/3,sy/3,0]; addchild(); // childs sides
addref(); s=[1/3,1/3,1/3]; t=[sx/3,-sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,0,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[sx/3,0,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,sy/3,0]; addchild(); 
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,-sy/3,0]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,0,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[-sx/3,0,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,sy/3,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,-sy/3,sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,sy/3,-sz/3]; addchild();
addref(); s=[1/3,1/3,1/3]; t=[0,-sy/3,-sz/3]; addchild();
}
/////////////////////////////////////
// A big flower (your initial selection is the root, size 2x2x2 with 30 iterations is good)
if (pattern=="bigflower") {
if (n<N) {
var arge=30; 
var ang1=arge*Math.random()-arge/2;
var ang2=arge*Math.random()-arge/2;
var ang3=arge*Math.random()-arge/2;
addref(); t=[0,sy,0]; r=[ang1,ang2,ang3];  addbuild(); addfill(35,5); addchild();
if (isint(2*n/N)==1 && n>0) {//add some leaves
player.print(2)
var ang4=arge*Math.random()-arge/2;
addref(); s=[10,1,3]; t=[4*sx,0,0]; r=[0,0,45+ang4];  
addbuild();addfill(35,5); addmath("x*x+z*z<=1");}}
if (n==N) { //do the flower
addref(); t=[0,sy,0]; s=[20,2,20]; addbuild(); addfill(35,0);// flower petals
//sqrt(x^2+z^2)<=0.5*(1+a*cos(b*atan2(x,z)+c*pi))
//set a,b,c (for example a=1,b=8 (number of petals), c=1 (45 deg shift) 
addmath("Math.sqrt(x*x+z*z)<=0.5*(1+0.8*Math.cos(5*Math.atan2(x,z)))");
addref(); t=[0,sy,0]; s=[20,2,20]; addbuild(); addfill(35,14);// flower petal ends
addmath("Math.sqrt(x*x+z*z)<=0.5*(1+0.8*Math.cos(5*Math.atan2(x,z))) && x*x+z*z>=0.5");
addref(); t=[0,1.5*sy,0];  s=[20,2,20]; addbuild(); addfill(35,15);// flower center black
addmath("Math.sqrt(x*x+z*z)<=0.2");
addref(); t=[0,1.5*sy,0];  s=[20,2,20]; addbuild(); addfill(41,0);// flower center
addmath("Math.sqrt(x*x+z*z)<=0.15");
}}
/////////////////////////////////////
// The dragoncurve: (or approximately it, with cubes instead of curves)
// start from a 64x1x64 selection (on the ground), build only last iteration
// for example /cs fracraft dragoncurve -11 sandstone 
if (pattern=="dragoncurve") {
var term=1/Math.sqrt(2);
addref(); s=[term,1,term]; t=[-sx/2,0,0];  r=[0,-45,0]; addchild(); 
addref(); s=[term,1,term]; t=[0,0,sz/2];  r=[0,-135,0]; addchild(); 
addref(); addbuild(); addfillarg(1);
}
/////////////////////////////////////
// An horizontal revolution around the selection
if (pattern=="revolution") {
var period=20; //number of iterations needed to make a complete revolution
//var radius=20; //radius of the revolution (in minecraft blocks)
var radius=2*Math.sqrt(px*px+pz*pz); // make the radius twice the player distance to initial selection
addref(); 
t=[radius*Math.cos(-n*2*Math.PI/period),0,radius*Math.sin(-n*2*Math.PI/period)]; 
//t=[radius*Math.cos(-n*2*Math.PI/period),0,2*radius*Math.sin(-n*2*Math.PI/period)]; //optionnal, makes an ellipse
//r=[0,n*360/period,0]; //optionnal, rotate build along axis
addbuild(); addfillarg(1);
addref(); addchild(); 
}
/////////////////////////////////////
// A rising spiral
if (pattern=="risingspiral") {
var period=20; //number of iterations needed to make a complete revolution
var yrise=1; //y-rise at each iteration (in minecraft blocks)
//var radius=20; //radius of the spiral (in minecraft blocks)
var radius=2*Math.sqrt(px*px+pz*pz); // make the radius twice the player distance to initial selection
//var gamma=30; radius=radius*Math.exp(-n/gamma); // optionnal, make radius quickly decay
//var periodr=160; radius=radius*Math.abs(Math.cos(-n*Math.PI/periodr)); // optionnal, make radius change periodically
addref(); 
t=[radius*Math.cos(-n*2*Math.PI/period),n*yrise,radius*Math.sin(-n*2*Math.PI/period)]; 
r=[0,n*360/period,0]; //optionnal, rotate build along axis
addbuild(); addfillarg(1);
//addref();t=[radius*Math.cos(-n*2*Math.PI/period+Math.PI),n*yrise,radius*Math.sin(-n*2*Math.PI/period+Math.PI)];
//r=[0,n*360/period,0]; //optionnal, rotate build along axis
 //addbuild();//make it a double
//addref();t=[radius*Math.cos(-n*2*Math.PI/period+Math.PI/2),n*yrise,radius*Math.sin(-n*2*Math.PI/period+Math.PI/2)]; addbuild();//a triple
//addref();t=[radius*Math.cos(-n*2*Math.PI/period+3*Math.PI/2),n*yrise,radius*Math.sin(-n*2*Math.PI/period+3*Math.PI/2)]; addbuild();//a quadruple
addref(); addchild(); 
}
/////////////////////////////////////
// Two revolutions at 45 deg around the selection 
if (pattern=="saturnrings") {
var period=40; //number of iterations needed to make a complete revolution
var radius=20; //radius of the revolution (in minecraft blocks)
addref(); 
t=[radius*Math.cos(-n*2*Math.PI/period),radius/2*Math.sin(-n*2*Math.PI/period),radius*Math.sin(-n*2*Math.PI/period)];
addbuild(); addfilla(1);
t=[radius*Math.cos(n*2*Math.PI/period),radius/2*Math.sin(-n*2*Math.PI/period),radius*Math.sin(n*2*Math.PI/period)]; 
addbuild(); addfillarg(1);
addref(); addchild(); 
}
/////////////////////////////////////
// A rainbow (from any 1x1x1 selection)
if (pattern=="rainbow") {
var period=120; //number of iterations needed to make the half revolution
var radius=40.5; //smallest radius of the rainbow (in minecraft blocks)
var csize=2; //size of each color block
var list=[2,10,9,5,4,1,14];//list of wool colors (forced)
addref(); 
for (var i = 0; i < list.length; i++) {
t=[radius*Math.cos(n*Math.PI/period),radius*Math.sin(n*Math.PI/period),0]; r=[0,0,n*180/period]; s=[csize/sx,csize/sy,1/sz];
addbuild(); addfill(35,list[i]);  radius=radius+csize;
if (0==1) {//double rainbow all the way
t=[1.5*radius*Math.cos(n*Math.PI/period),1.5*radius*Math.sin(n*Math.PI/period),0]; r=[0,0,n*180/period]; 
s=[1.5*csize/sx,1.5*csize/sy,1/sz]; addbuild(); addfill(35,list[i]); }
}
addref(); addchild(); 
}
/////////////////////////////////////
// Stairs going down (to the north). make a 1x1x1 or 2x1x1 or 3x1x1 selection from west to east
// and use with around 50 iterations or more
if (pattern=="downstairs") {
addref(); s=[1,4/sy,1/sz]; t=[0,2.5,0]; addbuild(); addfill(0,0); addexcout(7,0);//air
addref(); s=[1,1/sy,1/sz]; addbuild(); addfill(109,2); addexcout(7,0);// stairs
if (n>4) {addref(); s=[1,1/sy,1/sz]; t=[0,5,0]; addbuild(); addfill(1,0); addexcout(7,0);}// roof
if (n>0 && isint(n/4)) {
addref(); s=[1/sx,1/sy,1/sz]; t=[sx/2+0.5,2,0]; addbuild(); addfill(1,0);addexcout(7,0);//torch support
addref(); s=[1/sx,1/sy,1/sz]; t=[sx/2-0.5,2,0]; addbuild(); addfill(50,2);addexcout(7,0);}//torches
addref(); s=[1,4/sy,1/sz]; t=[0,-1,-1]; addchild(); 
}
/////////////////////////////////////
// dig straight down but omit diamond ores
// you must select a plane surface, and run around 60 times or more
if (pattern=="diamonddig") {
addref(); s=[1,1/sy,1]; addbuild(); 
addfill(0,0); addexcout(56,0); addexcout(7,0);//fill with air but retain diamonds and bedrock
addref(); s=[1,1/sy,1]; t=[0,-1,0]; addchild();
}
/////////////////////////////////////
// Some math expressions (using with arg1=filling blocktype)
if (pattern=="somemaths") {
addref(); addbuild(); addfillarg(1); 
//addmath("Math.pow(x,2)+Math.pow(y,2)+Math.pow(z,2)<=1");//sphere
addmath("Math.pow(x,2)+Math.pow(y,2)+Math.pow(z,2)<=1 && y<=0");//half sphere
//addmath("Math.pow(x,2)+Math.pow(y,2)+Math.pow(z,2)<=1");//cylinder
//addmath("x+y<=1/2");//plane
//addmath("r=Math.sqrt(x*x+z*z); Math.abs(y)<=Math.exp(-r*r*4)");//gaussian with radius
//addmath("r=Math.sqrt(x*x+z*z); Math.abs(y)<=Math.abs(Math.cos(r*6))");//cos with radius
//addmath("r=Math.sqrt(x*x+z*z); Math.abs(y)<=Math.abs(Math.cos(r*8))*Math.exp(-r*r*4)");//combine
}
/////////////////////////////////////
// fractal or torus within each others: start from a 32x32x32 selection
// /cs fracraft manytorus 0 sandstone, /cs fracraft manytorus -1 wool,...
if (pattern=="manytorus") {
var doit=1;
//var par=getarg(2); if (par!=-1) {doit=0; if (par==p) {doit=1;}};//(optionnal) arg2 specified builds only one parent
// use with /cs fracraft manytorus iterations blocktype parent
if (doit==1) {
addref(); s=[1,1,6/sz]; addbuild(); addfill(1,0); addfillarg(1);
addmath("Math.pow(0.85-Math.sqrt(x*x+y*y),2)+z*z/16 < 0.25*0.25");//torus
}
addref(); t=[3*sx/8,3*sy/8,0];  r=[0,90,-45]; addchild(); 
addref(); t=[-3*sx/8,3*sy/8,0];  r=[0,90,45]; addchild(); 
}
/////////////////////////////////////
// Fibonacci spiral (with copy) : DO NOT ITERATE MUCH !
if (pattern=="fibonaccispiral") {
var f0=0; var f1=1; var f2;//recompute the fibonacci suite 
for (var is = 0; is <= n; is++) {f2=f0+f1; f0=f1; f1=f2;}
//player.print(f2+' '+f0)
addref(); s=[f2/f0,f2/f0,f2/f0]; t=[sx*(1/2+f2/f0/2),sy*(f2/f0-1)/2,-sz*(f2/f0-1)/2]; r=[0,90,0]
addbuild(); addchild();
}
/////////////////////////////////////
// A cube that goes up with some random angle (do not use n<0 as result will always be different)
if (pattern=="randomcube") {
var arge=30; 
var ang1=arge*Math.random()-arge/2;
var ang2=arge*Math.random()-arge/2;
var ang3=arge*Math.random()-arge/2;
addref(); t=[0,1.5*sy,0]; r=[ang1,ang2,ang3];  addbuild();  addchild();
}
/////////////////////////////////////
// copies selection at same height but at the x-z where player is standing
// (good to bind this to a key for repetitive calls)
if (pattern=="copyunder") {
addref(); t=[px,0,pz];  addbuild();
}
////////////////////////////////////
//for the tutorial
//
// if (pattern=="mypattern") {
// addref();
// t=[10,10,0]; s=[1,1,1]; r=[0,0,0];
// addbuild();
// }

// if (pattern=="testchild") {
// //make a build
// addref(); addbuild();
// // make a first child
// addref();
// t=[10,10,0]; s=[1,1,1]; r=[0,0,0];
// addchild();
// // make a second child
// addref();
// t=[-10,10,0]; s=[1,1,1]; r=[0,0,0];
// addchild();
// }


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
return mat;}//matrix recording all builds and childs regions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
