// Exact triangle-sheet intersection query. Mirrors stream-intersections.js.
// Freestanding wasm32: no allocator, runtime imports, threads or SIMD required.
#define VMAX 4096
#define FMAX 8192
#define NMAX 8192
#define SMAX 65536
#define P(i,k) ((double)pose[(i)*3+(k)])
typedef struct {int left,right,count,fa,fb,v[4];} Node;
static float pose[VMAX*3];
static int faces[FMAX][3],hits[128],stack[SMAX];
static double faceBounds[FMAX*6],bounds[NMAX*6];
static Node nodes[NMAX];
static int NX,NY,nn,nf;
static double mn(double a,double b){return a<b?a:b;}
static double mx(double a,double b){return a>b?a:b;}
static double ab(double x){return x<0?-x:x;}
static int build(int x0,int x1,int y0,int y1){
 int id=nn++;Node *n=&nodes[id];n->count=(x1-x0)*(y1-y0);n->fa=-1;
 if(n->count==1){int a=y0*NX+x0;n->fa=nf;faces[nf][0]=a;faces[nf][1]=a+NX;faces[nf++][2]=a+1;n->fb=nf;faces[nf][0]=a+NX;faces[nf][1]=a+NX+1;faces[nf++][2]=a+1;n->v[0]=a;n->v[1]=a+1;n->v[2]=a+NX;n->v[3]=a+NX+1;}
 else if(y1-y0>=x1-x0){int m=(y0+y1)>>1;n->left=build(x0,x1,y0,m);n->right=build(x0,x1,m,y1);}
 else{int m=(x0+x1)>>1;n->left=build(x0,m,y0,y1);n->right=build(m,x1,y0,y1);}return id;
}
static int edge(int a,int b,int c,int d,int e){
 double ax=P(a,0),ay=P(a,1),az=P(a,2),dx=P(b,0)-ax,dy=P(b,1)-ay,dz=P(b,2)-az;
 double cx=P(c,0),cy=P(c,1),cz=P(c,2),ux=P(d,0)-cx,uy=P(d,1)-cy,uz=P(d,2)-cz,vx=P(e,0)-cx,vy=P(e,1)-cy,vz=P(e,2)-cz;
 double hx=dy*vz-dz*vy,hy=dz*vx-dx*vz,hz=dx*vy-dy*vx,det=ux*hx+uy*hy+uz*hz;if(ab(det)<1e-10)return 0;
 double sx=ax-cx,sy=ay-cy,sz=az-cz,u=(sx*hx+sy*hy+sz*hz)/det;if(u< -1e-6||u>1.000001)return 0;
 double qx=sy*uz-sz*uy,qy=sz*ux-sx*uz,qz=sx*uy-sy*ux,v=(dx*qx+dy*qy+dz*qz)/det;if(v< -1e-6||u+v>1.000001)return 0;
 double t=(vx*qx+vy*qy+vz*qz)/det;return t>1e-5&&t<1-1e-5;
}
static double orient(int a,int b,int c,int x,int y){return(P(b,x)-P(a,x))*(P(c,y)-P(a,y))-(P(b,y)-P(a,y))*(P(c,x)-P(a,x));}
static int inside(int i,int a,int b,int c,int x,int y){if(i==a||i==b||i==c)return 0;double u=orient(a,b,i,x,y),v=orient(b,c,i,x,y),w=orient(c,a,i,x,y);return(u>1e-9&&v>1e-9&&w>1e-9)||(u< -1e-9&&v< -1e-9&&w< -1e-9);}
static int coplanar(int *A,int *B){
 int a=A[0],b=A[1],c=A[2];double ax=P(b,0)-P(a,0),ay=P(b,1)-P(a,1),az=P(b,2)-P(a,2),bx=P(c,0)-P(a,0),by=P(c,1)-P(a,1),bz=P(c,2)-P(a,2);
 double n0=ay*bz-az*by,n1=az*bx-ax*bz,n2=ax*by-ay*bx,m=__builtin_sqrt(n0*n0+n1*n1+n2*n2);if(m<1e-9)return 0;
 for(int k=0;k<3;k++){int i=B[k];if(ab((P(i,0)-P(a,0))*n0+(P(i,1)-P(a,1))*n1+(P(i,2)-P(a,2))*n2)>m*1e-6)return 0;}
 int drop=ab(n0)>ab(n1)?(ab(n0)>ab(n2)?0:2):(ab(n1)>ab(n2)?1:2),x=(drop+1)%3,y=(drop+2)%3;
 for(int k=0;k<3;k++)if(inside(A[k],B[0],B[1],B[2],x,y)||inside(B[k],a,b,c,x,y))return 1;
 for(int i=0;i<3;i++)for(int j=0;j<3;j++){int a=A[i],b=A[(i+1)%3],c=B[j],d=B[(j+1)%3];if(orient(a,b,c,x,y)*orient(a,b,d,x,y)< -1e-16&&orient(c,d,a,x,y)*orient(c,d,b,x,y)< -1e-16)return 1;}return 0;
}
static int contains(int *a,int v){return a[0]==v||a[1]==v||a[2]==v;}
static int indexOf(int *a,int v){return a[0]==v?0:a[1]==v?1:2;}
static int crossed(int ti,int ui){
 int *T=faces[ti],*U=faces[ui],to=ti*6,uo=ui*6;
 for(int k=0;k<3;k++){double pad=1e-7+(faceBounds[to+3+k]-faceBounds[to+k]+faceBounds[uo+3+k]-faceBounds[uo+k])*2e-6;if(faceBounds[to+k]>faceBounds[uo+3+k]+pad||faceBounds[uo+k]>faceBounds[to+3+k]+pad)return 0;}
 int common=0;for(int k=0;k<3;k++)if(contains(U,T[k]))common++;if(common>=2)return 0;int hit=0;
 if(common==1){int shared=contains(U,T[0])?T[0]:contains(U,T[1])?T[1]:T[2],a=indexOf(T,shared),b=indexOf(U,shared);hit=edge(T[(a+1)%3],T[(a+2)%3],U[0],U[1],U[2])||edge(U[(b+1)%3],U[(b+2)%3],T[0],T[1],T[2]);}
 else for(int e=0;e<3&&!hit;e++)hit=edge(T[e],T[(e+1)%3],U[0],U[1],U[2])||edge(U[e],U[(e+1)%3],T[0],T[1],T[2]);
 if(!hit){int axes=0;for(int k=0;k<3;k++){double lo=mx(faceBounds[to+k],faceBounds[uo+k]),hi=mn(faceBounds[to+3+k],faceBounds[uo+3+k]);if(hi-lo>1e-7)axes++;}if(axes>=2)hit=coplanar(T,U);}return hit;
}
__attribute__((export_name("positions"))) unsigned positions_ptr(void){return(unsigned long)pose;}
__attribute__((export_name("hits"))) unsigned hits_ptr(void){return(unsigned long)hits;}
__attribute__((export_name("query"))) int query(int nx,int ny,int limit){
 if(nx<2||ny<2||nx*ny>VMAX||(nx-1)*(ny-1)*2>FMAX||(nx-1)*(ny-1)*2>NMAX||limit<1||limit>64)return -1;
 if(nx!=NX||ny!=NY){NX=nx;NY=ny;nn=nf=0;build(0,nx-1,0,ny-1);}
 for(int i=0;i<nf;i++){int *f=faces[i],o=i*6;for(int k=0;k<3;k++){faceBounds[o+k]=mn(mn(P(f[0],k),P(f[1],k)),P(f[2],k));faceBounds[o+3+k]=mx(mx(P(f[0],k),P(f[1],k)),P(f[2],k));}}
 for(int i=nn-1;i>=0;i--){Node *n=&nodes[i];int o=i*6;if(n->fa>=0){for(int k=0;k<3;k++){bounds[o+k]=mn(mn(P(n->v[0],k),P(n->v[1],k)),mn(P(n->v[2],k),P(n->v[3],k)));bounds[o+3+k]=mx(mx(P(n->v[0],k),P(n->v[1],k)),mx(P(n->v[2],k),P(n->v[3],k)));}}else{int a=n->left*6,c=n->right*6;for(int k=0;k<3;k++){bounds[o+k]=mn(bounds[a+k],bounds[c+k]);bounds[o+3+k]=mx(bounds[a+3+k],bounds[c+3+k]);}}}
 int sp=0,count=0;stack[sp++]=0;stack[sp++]=0;
 while(sp){int j=stack[--sp],i=stack[--sp];Node *A=&nodes[i],*B=&nodes[j];if(sp+6>=SMAX)return -1;
  if(i==j){if(A->fa>=0)continue;stack[sp++]=A->left;stack[sp++]=A->left;stack[sp++]=A->left;stack[sp++]=A->right;stack[sp++]=A->right;stack[sp++]=A->right;continue;}
  int a=i*6,c=j*6;if(bounds[a]>bounds[c+3]+1e-7||bounds[c]>bounds[a+3]+1e-7||bounds[a+1]>bounds[c+4]+1e-7||bounds[c+1]>bounds[a+4]+1e-7||bounds[a+2]>bounds[c+5]+1e-7||bounds[c+2]>bounds[a+5]+1e-7)continue;
  if(A->fa<0||B->fa<0){if(A->fa<0&&(B->fa>=0||A->count>=B->count)){stack[sp++]=A->left;stack[sp++]=j;stack[sp++]=A->right;stack[sp++]=j;}else{stack[sp++]=i;stack[sp++]=B->left;stack[sp++]=i;stack[sp++]=B->right;}continue;}
  for(int t=0;t<2;t++)for(int u=0;u<2;u++){int ti=t?A->fb:A->fa,ui=u?B->fb:B->fa;if(crossed(ti,ui)){hits[count*2]=ti;hits[count*2+1]=ui;if(++count>=limit)return count;}}
 }
 return count;
}
