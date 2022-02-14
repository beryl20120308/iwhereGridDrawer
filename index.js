let Cesium = require('./node_modules/cesium/Source/Cesium')
export class IwhereGridDrawer {
    constructor (viewer, gridRequest, gridLineColor) {
        this.viewer = viewer
        this.primitives = new Cesium.PrimitiveCollection();
        this.gridLineColor = gridLineColor || new Cesium.ColorGeometryInstanceAttribute(255/255, 255/255, 255/255, 0.25);
        this.primitives = new Cesium.PrimitiveCollection()
        viewer.scene.primitives.add(this.primitives)
        this.gridRequest = gridRequest
        this.showGridLine = true
        this.g_level = 0
    }
    // 用于外面调用来画线
    getVisibleGrids() {
        var extent = this.getVisibleRegion()
        this.g_level = this.getLevelByHeight(extent.height)
        let data = {
            "geoLevel": this.g_level,
            "lbLng": extent.xmin,
            "lbLat": extent.ymin,
            "rtLng": extent.xmax,
            "rtLat": extent.ymax
        }
        this.gridRequest(data).then(res => {
            this.gridsDrawAction(res.lons, res.lats)
        })
    }
    // 获取可视范围
    getVisibleRegion() {
        if (this.viewer.scene.mode == Cesium.SceneMode.SCENE2D) {
            // 范围对象
            var extent = {};
            var canvas = this.viewer.scene.canvas;
            let num = 10
            var cartesian = undefined
            var cartesianmax = undefined

            for (let index = 0; index <= canvas.height; index += num) {
                var pickmin = new Cesium.Cartesian2(0,index);
                cartesian = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(pickmin), this.viewer.scene);
                if(cartesian!==undefined)
                    break
            }

            if (cartesian!==undefined) {
                var cartographic = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
                extent.xmin = Cesium.Math.toDegrees(cartographic.longitude);
                extent.ymax = Cesium.Math.toDegrees(cartographic.latitude);
            } else {
                extent.xmin = -179.99;
                extent.ymax = 89.99;
            }
    
            for (let index = 0; index <= canvas.height; index += num) {
                var pickmax = new Cesium.Cartesian2(canvas.width,canvas.height-index);
                cartesianmax = this.viewer.scene.globe.pick(this.viewer.camera.getPickRay(pickmax), this.viewer.scene);
                if(cartesianmax!==undefined)
                    break
            }
    
            if(cartesianmax!==undefined)
            {
                var cartographicmax = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesianmax);
                extent.ymin = Cesium.Math.toDegrees(cartographicmax.latitude);
                extent.xmax = Cesium.Math.toDegrees(cartographicmax.longitude);
    
            } else {
                extent.ymin = -89.99;
                extent.xmax = 179.99;
            }
    
            if(cartesianmax==undefined || cartesian==undefined )
                extent.height = 14639381.0
            else
                extent.height = Math.ceil(this.viewer.camera.positionCartographic.height);
            
            if (extent.ymax < extent.ymin) {
                let temple = extent.ymin;
                extent.ymin = extent.ymax;
                extent.ymax = temple;
            }
            if (extent.xmax < extent.xmin) {
                let temple = extent.xmin;
                extent.xmin = extent.xmax;
                extent.xmax = temple;
            }
            
            return extent;
        } else {
            var extent = {};
            var field_view = this.viewer.camera.computeViewRectangle();
            if (field_view != null) {
                extent.xmin = Cesium.Math.toDegrees(field_view.west);
                extent.xmax = Cesium.Math.toDegrees(field_view.east);
                extent.ymin = Cesium.Math.toDegrees(field_view.south);
                extent.ymax = Cesium.Math.toDegrees(field_view.north);
            }
            if (extent.xmin == -180 || extent.xmin == undefined) {
                extent.xmin = -179;
            }
            if (extent.xmax == 180 || extent.xmax == undefined) {
                extent.xmax = 179;
            }
            if (extent.ymin == -90 || extent.ymin == undefined) {
                extent.ymin = -89;
            }
            if (extent.ymax == 90 || extent.ymax == undefined) {
                extent.ymax = 89;
            }
            extent.height = Math.ceil(this.viewer.camera.positionCartographic.height);
         
            return extent;
        }
    }
    // 根据高度获取网格层级
    getLevelByHeight(height) {
        var minLevel = 2;
        var maxLevel = 25;
        var height_maxLevel = 150;
        var result = height/height_maxLevel;
        var betweenLevel = Math.ceil(Math.log2(result));
        var level = maxLevel - betweenLevel;
        if (level < minLevel) {
            level = minLevel;
        }
        if (level > maxLevel) {
            level = maxLevel;
        }
        return level;
    }
    // 显示隐藏经纬线
    gridsSwitchAction (flag) {
        this.showGridLine = flag
        if (flag) {
            this.primitives.show = true
        } else {
            this.primitives.show = false
        }
    }
    // 清除所有的经纬线
    gridsRemoveAction() {
        this.primitives.removeAll()
    }
    // 画经纬线函数
    gridsDrawAction(lngs, lats) {
        this.gridsRemoveAction()
        let self = this
        if (!lngs || !lats) {
            return
        }
        let instanceOutLines = []  // 画网格线
        // 经度线
        for (let i = 0; i < lngs.length; i++) {
            let pArray = []
            for (let j = 0; j < lats.length; j = j + 2) {
                pArray.push(lngs[i]);
                pArray.push(lats[j])
            }
            // 确保首尾点绘制
            pArray.push(lngs[i]);
            pArray.push(lats[lats.length -1])
            let polyline = new Cesium.PolylineGeometry({
                positions: Cesium.Cartesian3.fromDegreesArray(pArray),
                width: 0.5
            })
            let instanceOutLine = new Cesium.GeometryInstance({
                geometry: polyline,
                attributes: {
                    color: self.gridLineColor
                }
            })
            instanceOutLines.push(instanceOutLine)
        }
        // 纬度线
        for (let i = 0; i < lats.length; i++) {
            let pArray = []
            for (let j = 0; j < lngs.length; j = j + 2) {
                pArray.push(lngs[j])
                pArray.push(lats[i])
            }
            pArray.push(lngs[lngs.length - 1]);
            pArray.push(lats[i])
            let polyline = new Cesium.PolylineGeometry({
                positions: Cesium.Cartesian3.fromDegreesArray(pArray),
                width: 0.5
            })
            let instanceOutLine = new Cesium.GeometryInstance({
                geometry: polyline,
                attributes: {
                    color: this.gridLineColor
                }
            })
            instanceOutLines.push(instanceOutLine)
        }
        this.primitives.add(new Cesium.Primitive({
            geometryInstances: instanceOutLines,
            appearance: new Cesium.PolylineColorAppearance({})
        }))
    }
    // 销毁
    destroy () {
        this.gridsRemoveAction();
        if (this.viewer) {
            if (this.primitives) {
                this.viewer.scene.primitives.remove(this.primitives)
            }
        }
        this.viewer = null
    }
}