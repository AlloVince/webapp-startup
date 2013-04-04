require.config({
      paths: {
            'jquerymobile': 'vendor/jquery.mobile-1.3.0',
            'jstorage' : 'vendor/jstorage',
            'underscore': 'vendor/underscore'
      },
      shim: {
          jquerymobile : {
            deps: [
                'css!../css/jquery.mobile-1.3.0.min.css'
            ]
          },
          underscore: {
              exports: '_'
          }
      }
});

function p(a){
    console.log(a);
}

require(['jquery', 'underscore', 'jquerymobile', 'jstorage'], function($, _) {

    var foodOrder = function(ui, elements){
        this.initUI(ui);
        this.initElements(elements);
        this.initEvent();
    }

    foodOrder.prototype = {

        dataReadyFunc : [],

        defaultUI : {
            form : '#form-order',
            foodgroup : '#control-group-food',
            foodListWrapper : '#select-food',
            formInvalidPopup : '#dialog-invalid-form',
            successPopup : '#dialog-success',
        }

        , defaultElements : {
            users : {
                tmpl : '#tmpl-users',
                data : 'data/users.json',
                trigger : '#select-user',
                displayer : '#order-display-user',
                valuer : '#order-user',
                ready : false,
                callback : null
            },
            restaurants : {
                tmpl : '#tmpl-restaurants',
                data : 'data/restaurants.json',
                trigger : '#select-restaurant',
                displayer : '#order-display-restaurant',
                valuer : "#order-restaurant",
                ready : false,
                callback : null
            },
            foods : {
                tmpl : '#tmpl-foods',
                data : 'data/foods.json',
                trigger : '#select-food',
                displayer : '#order-display-food',
                valuer : '#order-food',
                ready : false,
                callback : null
            }
        }

        , saveData : function(){
            var data = {
                user : this.elements.users.valuer.val(),
                restaurant : this.elements.restaurants.valuer.val(),
                food : this.elements.foods.valuer.val()
            }

            var key = 'foodOrder_' + data.user;

            //use jStorage to simulate form submit server handle
            $.jStorage.set(key, data);
        }

        , clearData : function(){
            $.jStorage.flush();
        }

        , getData : function(key){
            key = 'foodOrder_' +  key;
            return $.jStorage.get(key);
        }

        , initData : function(){
            //could save data by day and auto clear old data when ui init
        }

        , getOrderList : function(){
            var res = {
                ordered : [],
                unorder : [],
                total : 0
            };

            if(!this.isReady()){
                return res;
            }

            var users = this.elements.users.data,
            foods = this.elements.foods.data,
            i,
            user,
            item,
            data,
            total = 0;

            function getFoodPrice(name, restaurant){
                for(var i in foods[restaurant]){
                    if(foods[restaurant][i].name == name){
                        return foods[restaurant][i].price;
                    }
                }
            }

            for(i in users){
                user = users[i];
                item = {
                    user : user.name,
                    restaurant : null,
                    food : null,
                    price : null,
                }
                if(data = this.getData(user.name)){
                    item.restaurant = data.restaurant;
                    item.food = data.food;
                    item.price = getFoodPrice(item.food, item.restaurant);
                    total += item.price;
                    res.ordered.push(item);
                } else {
                    res.unorder.push(item);
                }
            }

            res.total = total;
            return res;
        }

        , isReady : function(){
            var isReady = true;
            for(var key in this.elements){
                if(this.elements[key].ready !== true){
                    isReady = false;
                }
            }
            return isReady;
        }

        , callReady : function(){
            if(true === this.isReady()){
                for(var key in this.dataReadyFunc){
                    this.dataReadyFunc[key]();
                }
            }
        }

        , dataReady : function(func){
            if (typeof func !== 'function') {
                return false;
            } 
            this.dataReadyFunc.push(func);
        }

        , events : {
            onRestaurantChange : function(){
                var foodList = this.ui.foodListWrapper.find('ul[data-role="listview"]');
                foodList.hide();

                var selectedRestaurant = this.elements.restaurants.valuer.val();
                this.elements.foods.valuer.val('');
                this.elements.foods.displayer.val('');
                if(selectedRestaurant !== ''){
                    this.ui.foodgroup.show();
                    foodList.filter('[data-restaurant="' + selectedRestaurant + '"]').show();
                }
            }

            , onFormSubmit : function(){
                var isValid = true;
                for(var key in this.elements){
                    var element = this.elements[key].valuer;
                    if(element.val() == ''){
                        isValid = false;
                    }
                }

                if(isValid === false){
                    $.mobile.changePage(this.ui.formInvalidPopup);
                    return false;
                }
                this.saveData();

                $.mobile.changePage(this.ui.successPopup);
                this.resetForm();
                return false;
            }
        }

        , resetForm : function(){
            for(var key in this.elements){
                var element = this.elements[key];
                element.valuer.val('');
                element.displayer.val('');
            }
            this.ui.foodgroup.hide();
        }

        , initElements : function(elements){
            elements = $.extend({}, this.defaultElements, elements);
            var self = this;

            _initElement = function(key, element){
                element.tmpl = $(element.tmpl);
                element.trigger = $(element.trigger);
                element.displayer = $(element.displayer);
                element.valuer = $(element.valuer);
                elements[key] = element;
                $.getScript(element.data, function(e){
                    self.elements[key].data = window[key];
                    self.elements[key].ready = true;

                    //check isReady every time
                    self.callReady();

                    if(!element.tmpl[0]){
                        return;
                    }
                    element.tmpl.replaceWith(
                        _.template(element.tmpl.html(), {
                            data : window[key]
                        })
                    );

                    element.trigger.on('click', 'a[data-value]', function(){
                        var lastValue = element.valuer.val();
                        var value = $(this).attr('data-value');
                        if(lastValue != value){
                            element.displayer.val($(this).text());
                            element.valuer.val(value).change();
                        }
                    });
                });
            }

            for(var key in elements){
                _initElement(key, elements[key]);
            }
            this.elements = elements;
        }

        , initUI : function(ui){
            this.ui = $.extend({}, this.defaultUI, ui);
            for(var key in this.ui){
                this.ui[key] = $(this.ui[key]);
            }
            this.ui.foodgroup.hide();
        }

        , initEvent : function(){
            this.elements.restaurants.valuer.on('change', $.proxy(this.events.onRestaurantChange, this));
            this.ui.form.on('submit', $.proxy(this.events.onFormSubmit, this));
        }
    }

    if($('#order-page')[0]){
        var order = new foodOrder();
        order.resetForm();
    }

    if($('#order-list')[0]){
        var order = new foodOrder();
        order.dataReady(function(){
            var tmpl = $('#tmpl-orders');
            tmpl.replaceWith(
                _.template(tmpl.html(), order.getOrderList())
            );
            $("#order-listview").listview('refresh');      

            $('#debug-clear').on('click', function(){
                order.clearData();
                location.reload();
            });
        });
    }
});
