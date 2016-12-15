const {shell} = require('electron')
var fs = require('fs')
var path = require('path')

var app = null;
var ary = ['application_key', 'client_key', 'userName', 'password', 'savePath'];
var data = {};
for (var i in ary) {
  var key = ary[i];
  data[key] = localStorage.getItem(key);
}
data.ncmb = null;
data.classes = [];
data.cl = null;
if (data.application_key && data.client_key) {
  data.ncmb = new NCMB(data.application_key, data.client_key);
  authentication(data.ncmb, data.userName, data.password)
    .then(() => {
      getAllExport(data.ncmb);
    }, (err) => {
      data.message = err;
      setTimeout(() => {
        data.message = null;
      }, 3000)
    });
}
data.message = null;

function getAllExport(ncmb) {
  app.classes = [];
  var Export = ncmb.DataStore('Export');
  Export.fetchAll()
    .then((ary) => {
      for (var i in ary) {
        ary[i].checked = false;
        ary[i].status = "";
        app.classes.push(ary[i]);
      }
      app.message = {
        message: "取得完了しました",
        type: "alert-success"
      }
      setTimeout(() => {
        data.message = null;
      }, 1000)
    })
}

function authentication(ncmb, userName, password) {
  return new Promise((res, rej) => {
    if (userName && password) {
      ncmb.User.login(userName, password)
        .then(() => {
          app.message = {
            message: "ログイン成功しました",
            type: "alert-success"
          }
          setTimeout(() => {
            data.message = null;
          }, 1000)
          res(null)
        })
        .catch((err) => {
          rej({
            type: 'alert-warning',
            message: `ログイン失敗しました。 ${err}`
          });
        })
    }else {
      res(null);
    }
  });
}

app = new Vue({
  el: '#app',
  data: data,
  methods: {
    open_mbaas: (e) => {
      shell.openExternal('https://console.mb.cloud.nifty.com/');
    },
    register_keys: (e) => {
      e.preventDefault();
      for (var i in ary) {
        var key = ary[i];
        localStorage.setItem(key, e.target[key].value);
        app[key] = e.target[key].value;
      }
      app.ncmb = new NCMB(app.application_key, app.client_key);
      authentication(app.ncmb, app.userName, app.password)
        .then(() => {
          getAllExport(app.ncmb);
        }, (err) => {
          app.message = err;
          setTimeout(() => {
            app.message = null;
          }, 3000)
        })
    },
    remove_keys: (e) => {
      app.ncmb = null;
    },
    check_all: (e) => {
      for (var i in app.classes) {
        app.classes[i].checked = true;
      }
    },
    reload_class: (e) => {
      getAllExport(app.ncmb);
    },
    export_execute: (e) => {
      e.preventDefault();
      if (app.savePath[app.savePath.length - 1] != path.sep) {
        app.savePath = app.savePath + path.sep;
      }
      var classes = app.classes.filter(function(d) {
        if (d.checked)
          return d;
      });
      for (var i in classes) {
        var className = classes[i];
        var d = new Date;
        exportToCSV(app.ncmb, className, `${app.savePath}${className.Name}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.csv`)
      }
    }
  }
});

var exportToCSV = function(ncmb, className, outputFileName) {
  var data = [];
  var limit = 1000;
  var ClassName = ncmb.DataStore(className.Name);
  className.status = "処理開始";
  var loop = function(page) {
    className.status = `データ取得中…${page + 1}ページ目`;
    return new Promise(function(resolve, reject) {
      ClassName
        .limit(limit)
        .skip(limit * page)
        .fetchAll()
        .then(function(results) {
          if (Object.keys(results).length == 0) {
            return resolve(true);
          }
          for (var i in results) {
            data.push(results[i]);
          }
          loop(page + 1)
            .then(function() {
              resolve(true);
            }, function(error) {
              reject(error);
            })
        })
        .catch(function(error) {
          className.status = `データ取得中にエラーが発生しました ${error}`;
          reject(error);
        })
    });
  }
  
  loop(0)
    .then(function() {
      csv = data2CSV(data);
      fs.writeFile(outputFileName, csv.join("\r\n"), function(err) {
        if (err) throw err;
        className.status = `保存しました。${outputFileName}`;
        console.log("File saved. " + outputFileName);
      });
    });
}


var data2CSV = function(data) {
  csv = [];
  header = [];
  for(var i in data) {
    var ary = Object.keys(data[i]);
    for (var j in ary) {
      if (ary[j] == 'acl') {
        continue;
      }
      if (header.indexOf(ary[j]) < 0) {
        header.push(ary[j]);
      }
    }
  }
  csv = [header.join("\t")];
  for(var i in data) {
    var row = data[i];
    var line = [];
    for (var j in header) {
      if (header[j] == 'acl') {
        continue;
      }
      var val = row[header[j]];
      switch (typeof val) {
      case 'boolean':
      case 'number':
        line.push(val)
        break;
      case 'object':
        switch (val.__type) {
        case 'Date':
        line.push(val.iso);
          break;
        case 'GeoPoint':
          line.push(val.latitude + "," + val.longitude);
          break;
        default:
          line.push(JSON.stringify(val).replace(/"/g, '""'));
          break;
        }
        break;
      default:
        try {
          line.push((val || "").replace(/"/g, '""'))
        }catch(e){
          console.log(val, typeof val)
        }
      }
    }
    csv.push('"' + line.join('"\t"') + '"');
  }
  return csv;
}
