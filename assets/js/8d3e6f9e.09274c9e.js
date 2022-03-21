"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[64],{3905:function(e,t,r){r.d(t,{Zo:function(){return l},kt:function(){return d}});var n=r(7294);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function s(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function o(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?s(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):s(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function i(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},s=Object.keys(e);for(n=0;n<s.length;n++)r=s[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(n=0;n<s.length;n++)r=s[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var c=n.createContext({}),u=function(e){var t=n.useContext(c),r=t;return e&&(r="function"==typeof e?e(t):o(o({},t),e)),r},l=function(e){var t=u(e.components);return n.createElement(c.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},f=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,s=e.originalType,c=e.parentName,l=i(e,["components","mdxType","originalType","parentName"]),f=u(r),d=a,m=f["".concat(c,".").concat(d)]||f[d]||p[d]||s;return r?n.createElement(m,o(o({ref:t},l),{},{components:r})):n.createElement(m,o({ref:t},l))}));function d(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var s=r.length,o=new Array(s);o[0]=f;var i={};for(var c in t)hasOwnProperty.call(t,c)&&(i[c]=t[c]);i.originalType=e,i.mdxType="string"==typeof e?e:a,o[1]=i;for(var u=2;u<s;u++)o[u]=r[u];return n.createElement.apply(null,o)}return n.createElement.apply(null,r)}f.displayName="MDXCreateElement"},1402:function(e,t,r){r.r(t),r.d(t,{assets:function(){return l},contentTitle:function(){return c},default:function(){return d},frontMatter:function(){return i},metadata:function(){return u},toc:function(){return p}});var n=r(3117),a=r(102),s=(r(7294),r(3905)),o=["components"],i={id:"stats",title:"Stats API",sidebar_label:"Stats"},c=void 0,u={unversionedId:"api/stats",id:"api/stats",title:"Stats API",description:"Stats factories",source:"@site/docs/api/stats.md",sourceDirName:"api",slug:"/api/stats",permalink:"/keuss/docs/api/stats",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/api/stats.md",tags:[],version:"current",frontMatter:{id:"stats",title:"Stats API",sidebar_label:"Stats"},sidebar:"someSidebar",previous:{title:"Signaller",permalink:"/keuss/docs/api/signal"},next:{title:"Queue",permalink:"/keuss/docs/api/queue"}},l={},p=[{value:"Stats factories",id:"stats-factories",level:2}],f={toc:p};function d(e){var t=e.components,r=(0,a.Z)(e,o);return(0,s.kt)("wrapper",(0,n.Z)({},f,r,{components:t,mdxType:"MDXLayout"}),(0,s.kt)("h2",{id:"stats-factories"},"Stats factories"),(0,s.kt)("p",null,"Stats factories are passed to queues either in queue creation or in backend init, inside ",(0,s.kt)("em",{parentName:"p"},"opts.signaller"),". Note that the result of the ",(0,s.kt)("inlineCode",{parentName:"p"},"new")," operation is indeed the factory; the result of the ",(0,s.kt)("inlineCode",{parentName:"p"},"require")," is therefore a ",(0,s.kt)("em",{parentName:"p"},"metafactory")),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-javascript"},"var local_redis_pubsub = require ('keuss/signal/redis-pubsub');\n\nvar local_redis_opts = {\n  Redis: {\n    port: 6379,\n    host: 'localhost',\n    db: 6\n  }\n};\n\nvar f_opts = {\n  stats: {\n    provider: signal_redis_pubsub,\n    opts: local_redis_opts\n  }\n  .\n  .\n  .\n}\n\nMQ (f_opts, (err, factory) => {\n  // queues created by factory here will use a redis-backed stats, hosted at redis at localhost, db 6\n})\n")),(0,s.kt)("p",null,"Stats objects, as of now, store the number of elements inserted and the number of elements extracted; they are created behind the scenes and tied to queue instances, and the stats-related interface is in fact part of the queues' interface."))}d.isMDXComponent=!0}}]);