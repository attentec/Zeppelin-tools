import random
import string
import json

from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, InvalidName

try:
    # Python 3.x
    from urllib.parse import quote_plus
except ImportError:
    # Python 2.x
    from urllib import quote_plus


def _flatten_dict(d):
    def expand(key, value):
        if isinstance(value, dict):
            return [(key + '.' + k, v) for k, v in _flatten_dict(value).items()]
        else:
            return [(key, value)]

    items = [item for k, v in d.items() for item in expand(k, v)]
    return dict(items)


def generate_code_skeleton_from_mongodb(z):
    paragraph_id = z.getInterpreterContext().getParagraphId()
    note_id = z.getInterpreterContext().getNoteId()
    host = z.input("1. Host", "localhost")
    user = z.input("2. User (optional)")
    password = z.input("3. Password (optional)")
    if user and password:
        uri = "mongodb://%s:%s@%s" % (
            quote_plus(user), quote_plus(password), host)
    else:
        uri = host
    rand_string = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(10))
    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        selectable_db = []
        dbs = client.database_names()
        for d in dbs:
            selectable_db.append((d, d))
        database = z.select("4. Database", selectable_db)
        try:
            db = client[database]
            selectable_col = []
            cols = db.collection_names()
            for c in cols:
                selectable_col.append((c, c))
            collection = z.select("5. Collection", selectable_col)
            try:
                col = db[collection]
                fields = []
                res = col.find(json.loads(z.input("6. MongoDB filter (Anvanced)", "{}")))
                i = 0
                for r in res:
                    fields += _flatten_dict(r).keys()
                    fields = list(set(fields))
                    i += 1
                    if i > z.input("7. Number of results scanned to get structure (Anvanced)", 10000):
                        break
                new_fields = []
                for f in fields:
                    new_fields.append(f.strip('.'))
                new_fields = sorted(new_fields)

                table = "%html <div class=\"form-group col-sm-12 col-md-12 col-lg-12\"><b>8. Select fields, types and default values</b><br><table class=\"table table-striped\" id=\"{rand_string}_fields\"><tr><th style='padding-right: 10px;'>Field</th><th>Type</th><th>Nullable</th><th>Default value (optional)</th></tr>".format(
                    rand_string=rand_string)
                for n in new_fields:
                    table += "<tr><td>{field}</td><td><select class=\"form-control input-sm\" id=\"{rand_string}_{field_type}_field\" name=\"{rand_string}_{field_type}_field\" onchange=\"update_skeleton()\">".format(
                        field=n, field_type=n.replace(".", "_"), rand_string=rand_string)
                    table += "<option value=\"0\">Do not include</option>"
                    table += "<option value=\"StringType\">String</option>"
                    table += "<option value=\"BinaryType\">Binary</option>"
                    table += "<option value=\"BooleanType\">Boolean</option>"
                    table += "<option value=\"DateType\">Date</option>"
                    table += "<option value=\"TimestampType\">Timestamp</option>"
                    table += "<option value=\"DecimalType\">Decimal</option>"
                    table += "<option value=\"DoubleType\">Double</option>"
                    table += "<option value=\"FloatType\">Float</option>"
                    table += "<option value=\"ByteType\">Byte</option>"
                    table += "<option value=\"IntegerType\">Integer</option>"
                    table += "<option value=\"LongType\">Long</option>"
                    table += "<option value=\"ShortType\">Short</option>"
                    table += "</select></td><td style='text-align:center'><input type=\"checkbox\" onchange=\"update_skeleton()\" id=\"{rand_string}_{field_type}_nullable\" name=\"{rand_string}_{field_type}_nullable\" value=\"true\" /></td><td><input type=\"text\" class=\"form-control input-sm\" id=\"{rand_string}_{field_type}_default\" name=\"{rand_string}_{field_type}_default\" onchange=\"update_skeleton()\"></td></tr>".format(
                        field_type=n.replace(".", "_"), rand_string=rand_string)

                table += "</table><br><button class=\"btn btn-success\" onclick=\"create_new_note()\" >Convert paragraph to the content in Code skeleton preview.</button><br><h2>Code skeleton preview</h2><pre id=\"{rand_string}_code\"><code class=\"python\">".format(
                    rand_string=rand_string)
                table += "<p>%pyspark</p>"
                table += "<p>from pymongo import MongoClient</p>"
                table += "<p>from pyspark.sql.types import StructField, StructType, NullType, StringType, BinaryType, BooleanType, DateType, \</p>"
                table += "<p>    TimestampType, DecimalType, DoubleType, FloatType, ByteType, IntegerType, LongType, ShortType, ArrayType, MapType</p>"
                table += "<p>import datetime<br>import dateutil.parser</p>"
                table += "<p>client = MongoClient(\"{}\")</p>".format(uri)
                table += "<p>db = client.{}</p>".format(database)
                table += "<p></p>"
                table += "<p>collection = db.{}.find({{}})</p>".format(collection)
                table += "<p></p>"
                table += "<p>schema = StructType(</p>"
                table += "<p>    [</p>"

                for n in new_fields:
                    table += "<div id=\"{rand_string}_{field_type}_schema\"></div>".format(
                        field_type=n.replace(".", "_"), rand_string=rand_string)

                table += "<p>    ]</p>"
                table += "<p>)</p>"
                table += "<p>data_list = []</p>"
                table += "<p></p>"
                table += "<p>for s in collection:</p>"
                table += "<p>    tmp = {}</p>"

                for n in new_fields:
                    table += "<div id=\"{rand_string}_{field_type}_get_data\"></div>".format(
                        field_type=n.replace(".", "_"), rand_string=rand_string)

                table += "<p>    </p>"
                table += "<p>    data_list.append(tmp)</p>"
                table += "<p></p>"
                table += "<p>latestData = sc.parallelize(data_list)</p>"
                table += "<p>latestData = latestData.map(</p>"
                table += "<p>    lambda s: [</p>"

                for n in new_fields:
                    table += "<div id=\"{rand_string}_{field_type}_insert\"></div>".format(
                        field_type=n.replace(".", "_"), rand_string=rand_string)

                table += "<p>    ]</p>"
                table += "<p>)</p>"
                table += "<p>latestdf = sqlContext.createDataFrame(latestData, schema)</p>"
                table += "<p>sqlContext.registerDataFrameAsTable(latestdf, \"{collection}\")</p></code></pre><script>".format(
                    collection=collection)
                table += "function leaf(path) {"
                table += "  path=path.split('.');"
                table += "  var res= \"\";"
                table += "  for (let i=0;i<path.length;i++){res+='[\"' + path[i] + '\"]';}"
                table += "  return res;"
                table += "}"
                table += "function update_skeleton (){"
                table += "let rand_string=\"{rand_string}\";".format(rand_string=rand_string)
                table += "let fields = ["
                for n in new_fields:
                    table += "{{'field': '{field}', 'field_type': '{field_type}', 'id': '{rand_string}_{field_type}'}},".format(
                        field=n, field_type=n.replace(".", "_"), rand_string=rand_string)
                table += "];"
                table += "for(let i = 0; i < fields.length; i++){{"
                table += "    let field_type = $('#' + fields[i]['id'] + '_field').val();"
                table += "    let nullable = $('#' + fields[i]['id'] + '_nullable').is(':checked');"
                table += "    let nullable_str = \"False\";"
                table += "    if(nullable){"
                table += "        nullable_str = \"True\";"
                table += "    }"
                table += "    if(field_type != 0){"
                table += "        let cast = 'str';"
                table += "        if(field_type === 'StringType'){cast = 'str'}"
                table += "        if(field_type === 'BinaryType'){cast = 'bytearray'}"
                table += "        if(field_type === 'BooleanType'){cast = 'bool'}"
                table += "        if(field_type === 'DateType'){cast = 'dateutil.parser.parse'}"
                table += "        if(field_type === 'TimestampType'){cast = 'dateutil.parser.parse'}"
                table += "        if(field_type === 'DecimalType' || field_type === 'DoubleType' || field_type === 'FloatType'){cast = 'float'}"
                table += "        if(field_type === 'ByteType' || field_type === 'IntegerType' || field_type === 'LongType' || field_type === 'ShortType'){cast = 'int'}"
                table += "        $('#' + fields[i]['id'] + '_schema').html(\"<p>        StructField(\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\", \"+field_type+\"(), \" + nullable_str + \"),</p>\");"
                table += "    let default_value = $('#' + fields[i]['id'] + '_default').val();"
                table += "    if(default_value !==\"\"){"
                table += "        if(cast ==\"str\"){"
                table += "        $('#' + fields[i]['id'] + '_get_data').html(\"<p>" \
                         "    try:<br>" \
                         "        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = \"+cast+\"(s\"+leaf(fields[i]['field'])+\")<br>" \
                         "    except UnicodeEncodeError:<br>" \
                         "        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = s\"+leaf(fields[i]['field'])+\".encode(\\\"utf-8\\\").decode(\\\"utf-8\\\")<br>" \
                         "    except (KeyError, TypeError):<br>" \
                         "        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = \" + cast +\"(\"+ default_value + \")" \
                         "</p>\")"
                table += "        } else {"
                table += "        $('#' + fields[i]['id'] + '_get_data').html(\"<p>    try:<br>        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = \"+cast+\"(s\"+leaf(fields[i]['field'])+\")<br>    except (KeyError, TypeError):<br>        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = \" + cast +\"(\"+ default_value + \")</p>\")"
                table += "        }"
                table += "    } else if(nullable){"
                table += "        if(cast ==\"str\"){"
                table += "        $('#' + fields[i]['id'] + '_get_data').html(\"<p>    try:<br>        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = \"+cast+\"(s\"+leaf(fields[i]['field'])+\")<br>" \
                         "    except UnicodeEncodeError:<br>" \
                         "        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = s\"+leaf(fields[i]['field'])+\".encode(\\\"utf-8\\\").decode(\\\"utf-8\\\")<br>" \
                         "    except (KeyError, TypeError):<br>        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = None</p>\")"
                table += "        } else {"
                table += "        $('#' + fields[i]['id'] + '_get_data').html(\"<p>    try:<br>        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = \"+cast+\"(s\"+leaf(fields[i]['field'])+\")<br>    except (KeyError, TypeError):<br>        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = None</p>\")"
                table += "        }"
                table += "    } else {"
                table += "        if(cast ==\"str\"){"
                table += "        $('#' + fields[i]['id'] + '_get_data').html(\"<p>    try:<br>        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = \"+cast+\"(s\"+leaf(fields[i]['field'])+\")<br>" \
                         "    except UnicodeEncodeError:<br>" \
                         "        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = s\"+leaf(fields[i]['field'])+\".encode(\\\"utf-8\\\").decode(\\\"utf-8\\\")<br>" \
                         "    except (KeyError, TypeError):<br>        continue</p>\")"
                table += "        } else {"
                table += "        $('#' + fields[i]['id'] + '_get_data').html(\"<p>    try:<br>        tmp[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"] = \"+cast+\"(s\"+leaf(fields[i]['field'])+\")<br>    except (KeyError, TypeError):<br>        continue</p>\")"
                table += "        }"
                table += "    }"
                table += "    $('#' + fields[i]['id'] + '_insert').html(\"        s[\\\"\"+fields[i]['field_type'].toLowerCase()+\"\\\"],<br>\")"
                table += "    }"

                table += "    "
                table += "    "
                table += "}}  "
                table += "}"
                table += "function get_content(){"
                table += "var html = document.getElementById(\"{rand_string}_code\").innerHTML;".format(
                    rand_string=rand_string)
                table += "html = html.replace(/<br>/g, \"\\n\");"
                table += "html = html.replace(/<\/p>/g, \"\\n\");"
                table += "return html.replace(/<[^>]*>/g, \"\");"
                table += "}"
                table += "function create_new_note(){"
                table += "    let tmp = window.location.href.split('/'); "
                table += "    let base = tmp[0]+'//'+tmp[2];"

                table += "    console.log({\"title\": \"Paragraph insert revised\", \"text\": encodeURIComponent(\"%spark \\\n println('Paragraph insert revised')\")});"
                table += "    $.ajax({"
                table += "            url: base + '/api/notebook/{note}/paragraph',".format(note=note_id)
                table += "            type: 'POST',"
                table += "            data: JSON.stringify({\"title\": \"Paragraph insert revised\", \"text\": get_content(), \"index\": 0}),"
                table += "            contentType: 'application/json',"
                table += "            dataType: 'json',"
                table += "            success: function(result){"
                table += "                 $.ajax({{url: base + '/api/notebook/{note}/paragraph/{paragraph}', type: 'DELETE',}});".format(
                    note=note_id, paragraph=paragraph_id)
                table += "        }});"
                table += "}"

                table += "</script></div>"

                print(table)

            except InvalidName:
                print("Choose a collection")
        except InvalidName:
            print("Choose a database")
    except ServerSelectionTimeoutError:
        print("No server found")
