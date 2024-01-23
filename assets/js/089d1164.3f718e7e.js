"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[8232],{3905:(e,t,n)=>{n.d(t,{Zo:()=>u,kt:()=>f});var r=n(7294);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var l=r.createContext({}),c=function(e){var t=r.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):s(s({},t),e)),n},u=function(e){var t=c(e.components);return r.createElement(l.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},p=r.forwardRef((function(e,t){var n=e.components,o=e.mdxType,a=e.originalType,l=e.parentName,u=i(e,["components","mdxType","originalType","parentName"]),p=c(n),f=o,m=p["".concat(l,".").concat(f)]||p[f]||d[f]||a;return n?r.createElement(m,s(s({ref:t},u),{},{components:n})):r.createElement(m,s({ref:t},u))}));function f(e,t){var n=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var a=n.length,s=new Array(a);s[0]=p;var i={};for(var l in t)hasOwnProperty.call(t,l)&&(i[l]=t[l]);i.originalType=e,i.mdxType="string"==typeof e?e:o,s[1]=i;for(var c=2;c<a;c++)s[c]=n[c];return r.createElement.apply(null,s)}return r.createElement.apply(null,n)}p.displayName="MDXCreateElement"},7893:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>s,default:()=>d,frontMatter:()=>a,metadata:()=>i,toc:()=>c});var r=n(7462),o=(n(7294),n(3905));const a={id:"shutdown",title:"Shutdown",sidebar_label:"Shutdown"},s=void 0,i={unversionedId:"Usage/shutdown",id:"Usage/shutdown",title:"Shutdown",description:"It is a good practice to call close(cb) on the factories to release all resources once you're done, or at shutdown if you want your shutdowns clean and graceful (the log-lived redis or mongodb connections are terminated here, for example); also, you should loop over your queues and perform a drain() on them before calling close() on their factories: this will ensure any un-consumed data is popped, and any unwritten data is written. Also, it'll ensure all your (local) waiting consumers will end (on 'cancel' error).",source:"@site/docs/04-Usage/03-shutdown.md",sourceDirName:"04-Usage",slug:"/Usage/shutdown",permalink:"/keuss/docs/Usage/shutdown",draft:!1,editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/04-Usage/03-shutdown.md",tags:[],version:"current",sidebarPosition:3,frontMatter:{id:"shutdown",title:"Shutdown",sidebar_label:"Shutdown"},sidebar:"tutorialSidebar",previous:{title:"Redis Connections",permalink:"/keuss/docs/Usage/redis-conns"},next:{title:"Using no signaller",permalink:"/keuss/docs/Usage/no-signaller"}},l={},c=[],u={toc:c};function d(e){let{components:t,...n}=e;return(0,o.kt)("wrapper",(0,r.Z)({},u,n,{components:t,mdxType:"MDXLayout"}),(0,o.kt)("p",null,"It is a good practice to call ",(0,o.kt)("a",{parentName:"p",href:"../api/factory#close-factory-close"},(0,o.kt)("inlineCode",{parentName:"a"},"close(cb)"))," on the factories to release all resources once you're done, or at shutdown if you want your shutdowns clean and graceful (the log-lived redis or mongodb connections are terminated here, for example); also, you should loop over your queues and perform a ",(0,o.kt)("a",{parentName:"p",href:"../api/queue#drain-drain-queue"},(0,o.kt)("inlineCode",{parentName:"a"},"drain()"))," on them before calling ",(0,o.kt)("inlineCode",{parentName:"p"},"close()")," on their factories: this will ensure any un-consumed data is popped, and any unwritten data is written. Also, it'll ensure all your (local) waiting consumers will end (on 'cancel' error)."),(0,o.kt)("admonition",{type:"note"},(0,o.kt)("p",{parentName:"admonition"},"Factories do not keep track of the created Queues, so this can't be done internally as part of the ",(0,o.kt)("inlineCode",{parentName:"p"},"close()"),"; this may change in the future.")))}d.isMDXComponent=!0}}]);