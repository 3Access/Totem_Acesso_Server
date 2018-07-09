var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var methodOverride = require('method-override')
var cors = require('cors');
var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(cors());

var con = mysql.createConnection({
    host: "10.0.2.180",
    user: "root",
    password: "Mudaragora00",
    database: 'zoologico'
 });

 con.connect(function(err) {
    if (err) throw err;
    
	log_("Database conectado!")		
    
	log_("Aguardando conexões ...")	
});

function log_(str){
        console.log(str)
}

app.post('/getVisitantes', function(req, res) {

    var idTotem = req.body.id

    log_('Totem: '+ idTotem + ' - Verificando todas as areas:')
            
    var sql = "SELECT \
        visitantes.id,\
        UPPER(visitantes.name) AS name,\
        UPPER(visitantes.cpf) AS cpf,\
        UPPER(visitantes.rg) AS rg,\
        UPPER(visitantes.telefone) AS telefone,\
        UPPER(visitantes.endereco) AS endereco,\
        UPPER(visitantes.bairro) AS bairro,\
        UPPER(visitantes.obs) AS obs,\
        visitantes.fotosamba,\
        visitantes.status,\
        crachas.id AS CRACHA_ID,\
        crachas.id_tipo AS CRACHA_TIPO,\
        crachas.id_cracha AS CRACHA,\
        UPPER(funcionarios.name) AS AUTORIZANTE,\
        funcionarios.id AS AUTORIZANTE_ID,\
        visitantes_tipos.id AS id_tipo,\
        visitantes_tipos.name AS TIPO,\
        UPPER(empresas.name) AS EMPRESA \
    FROM visitantes \
    LEFT JOIN  visitantes_tipos ON visitantes_tipos.id =  visitantes.id_tipo \
    LEFT JOIN  funcionarios ON funcionarios.id =  visitantes.id_autorizado_por \
    LEFT JOIN  crachas ON crachas.id =  visitantes.id_cracha \
    LEFT JOIN  empresas ON empresas.id =  visitantes.id_empresa \
    WHERE visitantes.status = 1;";

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/getVisitantesNome', function(req, res) {

    var idTotem = req.body.id
    var idArea = req.body.idArea    

    log_('Totem: '+ idTotem + ' - Verificando contador da area:', idArea)
            
    let sql = "SELECT \
        visitantes.id,\
        UPPER(visitantes.name) AS name,\
        UPPER(visitantes.cpf) AS cpf,\
        UPPER(visitantes.rg) AS rg,\
        UPPER(visitantes.telefone) AS telefone,\
        UPPER(visitantes.endereco) AS endereco,\
        UPPER(visitantes.bairro) AS bairro,\
        UPPER(visitantes.obs) AS obs,\
        visitantes.foto,\
        visitantes.fotosamba,\
        visitantes.status,\
        crachas.id AS CRACHA_ID,\
        crachas.id_tipo AS CRACHA_TIPO,\
        crachas.id_cracha AS CRACHA,\
        funcionarios.id AS AUTORIZANTE_ID,\
        UPPER(funcionarios.name) AS AUTORIZANTE,\
        UPPER(visitantes_tipos.name) AS TIPO,\
        UPPER(empresas.name) AS EMPRESA \
    FROM visitantes \
    LEFT JOIN  visitantes_tipos ON visitantes_tipos.id =  visitantes.id_tipo \
    LEFT JOIN  funcionarios ON funcionarios.id =  visitantes.id_autorizado_por \
    LEFT JOIN  crachas ON crachas.id =  visitantes.id_cracha \
    LEFT JOIN  empresas ON empresas.id =  visitantes.id_empresa \
    WHERE visitantes.name LIKE '%%1%' AND visitantes.status = %2;"

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.post('/decrementAreaCounter', function(req, res) {

    var idTotem = req.body.id
    var idArea = req.body.idArea

    log_('Totem: '+ idTotem + ' - Decrementando contador da area:', idArea)
            
    var sql = "UPDATE \
    3access.3a_area_acesso \
    SET 3access.3a_area_acesso.lotacao_area_acesso = 3access.3a_area_acesso.lotacao_area_acesso - 1 \
    WHERE 3access.3a_area_acesso.id_area_acesso = " + idArea + ";"

   // log_(sql)

    con.query(sql, function (err1, result) {        
        if (err1) throw err1;           
        res.json({"success": result}); 
    });
});

app.listen(8085);
