"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[8187],{3905:(e,t,n)=>{n.d(t,{Zo:()=>m,kt:()=>d});var r=n(7294);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,i=function(e,t){if(null==e)return{};var n,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var o=r.createContext({}),p=function(e){var t=r.useContext(o),n=t;return e&&(n="function"==typeof e?e(t):s(s({},t),e)),n},m=function(e){var t=p(e.components);return r.createElement(o.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},c=r.forwardRef((function(e,t){var n=e.components,i=e.mdxType,a=e.originalType,o=e.parentName,m=l(e,["components","mdxType","originalType","parentName"]),c=p(n),d=i,f=c["".concat(o,".").concat(d)]||c[d]||u[d]||a;return n?r.createElement(f,s(s({ref:t},m),{},{components:n})):r.createElement(f,s({ref:t},m))}));function d(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var a=n.length,s=new Array(a);s[0]=c;var l={};for(var o in t)hasOwnProperty.call(t,o)&&(l[o]=t[o]);l.originalType=e,l.mdxType="string"==typeof e?e:i,s[1]=l;for(var p=2;p<a;p++)s[p]=n[p];return r.createElement.apply(null,s)}return r.createElement.apply(null,n)}c.displayName="MDXCreateElement"},1835:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>o,contentTitle:()=>s,default:()=>u,frontMatter:()=>a,metadata:()=>l,toc:()=>p});var r=n(7462),i=(n(7294),n(3905));const a={id:"examples",title:"Examples",sidebar_label:"Examples"},s=void 0,l={unversionedId:"Usage/Pipelines/examples",id:"Usage/Pipelines/examples",title:"Examples",description:"* simplest: a very simple pipeline with just 2 queues connected with a DirectLink",source:"@site/docs/04-Usage/06-Pipelines/04-examples.md",sourceDirName:"04-Usage/06-Pipelines",slug:"/Usage/Pipelines/examples",permalink:"/keuss/docs/Usage/Pipelines/examples",draft:!1,editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/04-Usage/06-Pipelines/04-examples.md",tags:[],version:"current",sidebarPosition:4,frontMatter:{id:"examples",title:"Examples",sidebar_label:"Examples"},sidebar:"tutorialSidebar",previous:{title:"Building",permalink:"/keuss/docs/Usage/Pipelines/building"},next:{title:"Stream-mongo backend",permalink:"/keuss/docs/Usage/Streaming/stream-mongo"}},o={},p=[],m={toc:p};function u(e){let{components:t,...n}=e;return(0,i.kt)("wrapper",(0,r.Z)({},m,n,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("a",{parentName:"li",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/simplest"},"simplest"),": a very simple pipeline with just 2 queues connected with a DirectLink"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("a",{parentName:"li",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/simulation-fork"},"simulation-fork"),": a somewhat complete example with ",(0,i.kt)("inlineCode",{parentName:"li"},"DirectLink"),", ",(0,i.kt)("inlineCode",{parentName:"li"},"ChoiceLink")," and ",(0,i.kt)("inlineCode",{parentName:"li"},"Sink")," instances connecting 5 queues in a fork-like flow. Each process function adds some basic simulated processing with payload updates, random failures and random delays. It also uses deadletter"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("a",{parentName:"li",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/builder"},"builder"),": variant of ",(0,i.kt)("inlineCode",{parentName:"li"},"simulation-fork")," done with a pipeline builder"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("a",{parentName:"li",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/fromRecipe"},"fromRecipe"),": variant of ",(0,i.kt)("inlineCode",{parentName:"li"},"simulation-fork"),", almost indentical to ",(0,i.kt)("inlineCode",{parentName:"li"},"builder")," but using a ",(0,i.kt)("inlineCode",{parentName:"li"},"factory.pipelineFromRecipe"))))}u.isMDXComponent=!0}}]);