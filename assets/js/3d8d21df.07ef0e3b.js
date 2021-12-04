"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[535],{3905:function(e,t,r){r.d(t,{Zo:function(){return p},kt:function(){return m}});var n=r(7294);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function o(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function s(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?o(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):o(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function i(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},o=Object.keys(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var u=n.createContext({}),l=function(e){var t=n.useContext(u),r=t;return e&&(r="function"==typeof e?e(t):s(s({},t),e)),r},p=function(e){var t=l(e.components);return n.createElement(u.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},d=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,o=e.originalType,u=e.parentName,p=i(e,["components","mdxType","originalType","parentName"]),d=l(r),m=a,b=d["".concat(u,".").concat(m)]||d[m]||c[m]||o;return r?n.createElement(b,s(s({ref:t},p),{},{components:r})):n.createElement(b,s({ref:t},p))}));function m(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=r.length,s=new Array(o);s[0]=d;var i={};for(var u in t)hasOwnProperty.call(t,u)&&(i[u]=t[u]);i.originalType=e,i.mdxType="string"==typeof e?e:a,s[1]=i;for(var l=2;l<o;l++)s[l]=r[l];return n.createElement.apply(null,s)}return n.createElement.apply(null,r)}d.displayName="MDXCreateElement"},1171:function(e,t,r){r.r(t),r.d(t,{frontMatter:function(){return i},contentTitle:function(){return u},metadata:function(){return l},toc:function(){return p},default:function(){return d}});var n=r(7462),a=r(3366),o=(r(7294),r(3905)),s=["components"],i={id:"about",title:"About",sidebar_label:"About"},u=void 0,l={unversionedId:"about",id:"about",isDocsHomePage:!0,title:"About",description:"Keuss is an attempt or experiment to provide a serverless, persistent and high-available queue middleware supporting delays/schedule, using mongodb and redis to provide most of the backend needs. As of now, it has evolved into a rather capable and complete queue middleware.",source:"@site/docs/about.md",sourceDirName:".",slug:"/",permalink:"/keuss/docs/",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/about.md",tags:[],version:"current",frontMatter:{id:"about",title:"About",sidebar_label:"About"},sidebar:"someSidebar",next:{title:"Quickstart",permalink:"/keuss/docs/quickstart"}},p=[],c={toc:p};function d(e){var t=e.components,r=(0,a.Z)(e,s);return(0,o.kt)("wrapper",(0,n.Z)({},c,r,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("p",null,"Keuss is an attempt or experiment to provide a serverless, persistent and high-available queue middleware supporting delays/schedule, using mongodb and redis to provide most of the backend needs. As of now, it has evolved into a rather capable and complete queue middleware."),(0,o.kt)("p",null,"The underlying idea is that the key to provide persistency, HA and load balance is to rely on a storage subsystem that provides that, and build the rest on top. Instead of reinventing the wheel by building such as storage I simply tried to adapt what's already out there."),(0,o.kt)("p",null,"Modelling a queue with mongodb, for example, proved easy enough. It resulted simple, cheap and provides great persistency, HA and decent support for load balancing. Although using Redis provided similar results, in both cases the load balancing part was somewhat incomplete: the whole thing lacked a ",(0,o.kt)("em",{parentName:"p"},"bus")," to signal all clients about, for example, when an insertion in a particular queue takes place. Without this layer a certain amount of polling is needed, so it's obviously a Nice Thing To Have."),(0,o.kt)("p",null,"Keuss ended up being a somewhat ",(0,o.kt)("em",{parentName:"p"},"serverless")," queue system, where the ",(0,o.kt)("em",{parentName:"p"},"server")," or common parts are bare storage systems such as redis or mongodb. There is no need for any extra ",(0,o.kt)("em",{parentName:"p"},"keuss server")," in between clients and storage (although an actual keuss-server does exist, serving a different purpose on top of plain keuss). Thus, all keuss actually lays at the ",(0,o.kt)("em",{parentName:"p"},"client")," side."))}d.isMDXComponent=!0}}]);