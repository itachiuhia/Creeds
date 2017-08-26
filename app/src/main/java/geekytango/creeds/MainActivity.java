package geekytango.creeds;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Build;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import static android.support.v4.view.ViewCompat.setLayerType;

public class MainActivity extends AppCompatActivity {
    WebView wv;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,WindowManager.LayoutParams.FLAG_FULLSCREEN);

        setContentView(R.layout.activity_main);
        getSupportActionBar().hide();
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        wv=(WebView)findViewById(R.id.wv1);
        wv.getSettings().setJavaScriptEnabled(true);
        wv.setHorizontalScrollBarEnabled(false);
        wv.setVerticalScrollBarEnabled(false);
        wv.loadUrl("file:///android_asset/MainScreen/index.html");
        wv.addJavascriptInterface(MainActivity.this,"myinterface");
        wv.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        wv.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);

    }
    @JavascriptInterface
    public void playcoil(){
        Intent i= new Intent(MainActivity.this,coilActivity.class);
        startActivity(i);
     }
    @JavascriptInterface
    public void playcoils(){
        Intent i= new Intent(MainActivity.this,planateryActivity.class);
        startActivity(i);
    }
    @JavascriptInterface
    public void playcoilss(){
        Intent i= new Intent(MainActivity.this,ComingSoon.class);
        startActivity(i);
    }

}
