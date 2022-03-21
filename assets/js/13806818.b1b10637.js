"use strict";(self.webpackChunkkeuss_docusaurus=self.webpackChunkkeuss_docusaurus||[]).push([[431],{3905:function(e,t,n){n.d(t,{Zo:function(){return u},kt:function(){return f}});var r=n(7294);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,r,i=function(e,t){if(null==e)return{};var n,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var p=r.createContext({}),l=function(e){var t=r.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):s(s({},t),e)),n},u=function(e){var t=l(e.components);return r.createElement(p.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},m=r.forwardRef((function(e,t){var n=e.components,i=e.mdxType,a=e.originalType,p=e.parentName,u=o(e,["components","mdxType","originalType","parentName"]),m=l(n),f=i,d=m["".concat(p,".").concat(f)]||m[f]||c[f]||a;return n?r.createElement(d,s(s({ref:t},u),{},{components:n})):r.createElement(d,s({ref:t},u))}));function f(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var a=n.length,s=new Array(a);s[0]=m;var o={};for(var p in t)hasOwnProperty.call(t,p)&&(o[p]=t[p]);o.originalType=e,o.mdxType="string"==typeof e?e:i,s[1]=o;for(var l=2;l<a;l++)s[l]=n[l];return r.createElement.apply(null,s)}return r.createElement.apply(null,n)}m.displayName="MDXCreateElement"},6629:function(e,t,n){n.r(t),n.d(t,{assets:function(){return u},contentTitle:function(){return p},default:function(){return f},frontMatter:function(){return o},metadata:function(){return l},toc:function(){return c}});var r=n(3117),i=n(102),a=(n(7294),n(3905)),s=["components"],o={id:"examples",title:"Examples",sidebar_label:"Examples"},p=void 0,l={unversionedId:"usage/pipelines/examples",id:"usage/pipelines/examples",title:"Examples",description:"* simplest: a very simple pipeline with just 2 queues connected with a DirectLink",source:"@site/docs/usage/pipelines/examples.md",sourceDirName:"usage/pipelines",slug:"/usage/pipelines/examples",permalink:"/keuss/docs/usage/pipelines/examples",editUrl:"https://github.com/pepmartinez/keuss/edit/master/website/docs/usage/pipelines/examples.md",tags:[],version:"current",frontMatter:{id:"examples",title:"Examples",sidebar_label:"Examples"},sidebar:"someSidebar",previous:{title:"Building",permalink:"/keuss/docs/usage/pipelines/building"},next:{title:"Factory",permalink:"/keuss/docs/api/factory"}},u={},c=[],m={toc:c};function f(e){var t=e.components,n=(0,i.Z)(e,s);return(0,a.kt)("wrapper",(0,r.Z)({},m,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("a",{parentName:"li",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/simplest"},"simplest"),": a very simple pipeline with just 2 queues connected with a DirectLink"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("a",{parentName:"li",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/simulation-fork"},"simulation-fork"),": a somewhat complete example with ",(0,a.kt)("inlineCode",{parentName:"li"},"DirectLink"),", ",(0,a.kt)("inlineCode",{parentName:"li"},"ChoiceLink")," and ",(0,a.kt)("inlineCode",{parentName:"li"},"Sink")," instances connecting 5 queues in a fork-like flow. Each process function adds some basic simulated processing with payload updates, random failures and random delays. It also uses deadletter"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("a",{parentName:"li",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/builder"},"builder"),": variant of ",(0,a.kt)("inlineCode",{parentName:"li"},"simulation-fork")," done with a pipeline builder"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("a",{parentName:"li",href:"https://github.com/pepmartinez/keuss/tree/master/examples/pipelines/fromRecipe"},"fromRecipe"),": variant of ",(0,a.kt)("inlineCode",{parentName:"li"},"simulation-fork"),", almost indentical to ",(0,a.kt)("inlineCode",{parentName:"li"},"builder")," but using a ",(0,a.kt)("inlineCode",{parentName:"li"},"factory.pipelineFromRecipe"))))}f.isMDXComponent=!0}}]);