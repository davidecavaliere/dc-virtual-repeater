# Angular Virtual Repeater

I used to develop with the [vaadin framework](http://https://vaadin.com/home). It has a cool component called TableContainer (or something similar). The point is that this component has a lazy loading interface. It work with the following logic. What it does is to ask to the server only the elements that need to be shown are actually visible in the table.

Lately I'm working a lot with javascript and angularjs. I'm also working witha [angular-material](http://material.angular.com) and I found the [virtual divider component](https://material.angularjs.org/latest/#/demo/material.components.virtualRepeat). Which pretty amazing so I thought what a cool feature would be if I could load just the element actually visible in the repeater.

This is where I ended up.

Let's imagine the following scenario.
```html
<!-- the view -->

<p>
  Total Things : {{count.total}}
</p>
<div class="virtualRepeatdemoVerticalUsage">
  <md-virtual-repeat-container id="vertical-container">
    <div md-virtual-repeat="item in items"
        class="repeated-item" flex>
      {{$index}} : {{item.name}}
    </div>
  </md-virtual-repeat-container>
</div>

```

```javascript
// controller

.controller('VirtualRepeaterDemoCtrl', function ($scope, $log, ThingFactory) {

  $scope.count = ThingFactory.count();
  $scope.items = [];

  $scope.count.$promise.then(function(count) {

    for (var i = 0; i < $scope.count.total; i++) {
      $scope.items.push(new ThingFactory());
    }

});

```

where ThingFactory is

```javascript
.factory('ThingFactory', function($log, $resource) {
  return $resource('/api/things/:id', { id : '@_id'}, {
    count : {
      url : '/api/things/count/:query',
      params : { query : {} }
    },
    getByIndex : {
      url : 'api/things/skip/:skip/limit/:limit',
      params : {limit : 1},
      transformResponse : function(data) {
        return angular.fromJson(data)[0];
      }
    }
  });
})

```

Please note that the function getByIndex is crucial for the lazy loading feauture to work.

Server side will have something like

```javascript
// thing.index.js
var express = require('express');
var controller = require('./thing.controller');

var router = express.Router();

router.get('/skip/:skip/limit/:limit', getByIndex);
router.get('/count/:query', controller.count);
```

```javascript
//thing.controller.js
exports.count = function(req, res) {
  var query = req.params.query;
  Thing.count({}, function(err, count) {
    if (err) { return handleError(res, err); }
    return res.json({total : count});
  });
}

exports.getByIndex = function(req, res) {
  Thing.find({}, null, { skip : req.params.skip, limit : req.params.limit}, function(err, thing) {
    if(err) { return handleError(res, err); }
    return res.json(thing);
  });
}

```

A now with a little hack on the the virtual repeat directive...

```
diff --git a/src/components/virtualRepeat/virtual-repeater.js b/src/components/virtualRepeat/virtual-repeater.js
index 4d5888f..e84b3af 100644
--- a/src/components/virtualRepeat/virtual-repeater.js
+++ b/src/components/virtualRepeat/virtual-repeater.js
@@ -349,13 +349,14 @@ function VirtualRepeatDirective($parse) {


 /** @ngInject */
-function VirtualRepeatController($scope, $element, $attrs, $browser, $document, $$rAF) {
+function VirtualRepeatController($scope, $element, $attrs, $browser, $document, $$rAF, $mdUtil) {
   this.$scope = $scope;
   this.$element = $element;
   this.$attrs = $attrs;
   this.$browser = $browser;
   this.$document = $document;
   this.$$rAF = $$rAF;
+  this.$mdUtil = $mdUtil;

   /** @type {boolean} Whether we are in on-demand mode. */
   this.onDemand = $attrs.hasOwnProperty('mdOnDemand');
@@ -656,12 +657,33 @@ VirtualRepeatController.prototype.getBlock_ = function(index) {
  * @private
  */
 VirtualRepeatController.prototype.updateBlock_ = function(block, index) {
+  var item = block.scope.item;
+
+  // TODO we need to figure out if item
+  // is an instance of Resource (ngResource)
+  if (angular.isFunction(item.$getByIndex)) {
+    // check if resource is already resolved
+
+    var callService = function(index) {
+      item.$getByIndex({ skip : index });
+    };
+
+    if (angular.isDefined(item.$resolved) && item.$resolved) {
+      // TODO set timeout to refresh element even if is resolved
+    } else {
+      // TODO should calculate this value on an estimation of latency of the server
+      var latency = 500;
+      this.$mdUtil.debounce(callService, latency)(index);
+    }
+  }
+
   this.blocks[index] = block;

   if (!block.new &&
       (block.scope.$index === index && block.scope[this.repeatName] === this.items[index])) {
     return;
   }
+
   block.new = false;

   // Update and digest the block's scope.
```

Code is available in this fork of the [angular material repo](https://github.com/davidecavaliere/material/tree/lazy_loading)

Instead of hacking the directive like that you can override the ``function VirtualRepeatController`` and the ``VirtualRepeatController.prototype.updateBlock_`` function to change their behaviour redefining them in any js file.
