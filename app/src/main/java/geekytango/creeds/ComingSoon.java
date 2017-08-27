package geekytango.creeds;

import android.content.pm.ActivityInfo;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

public class ComingSoon extends AppCompatActivity {
    WebView wv;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,WindowManager.LayoutParams.FLAG_FULLSCREEN);

        setContentView(R.layout.activity_coming_soon);
        getSupportActionBar().hide();
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        wv=(WebView)findViewById(R.id.wv1);
        wv.getSettings().setJavaScriptEnabled(true);
        wv.setHorizontalScrollBarEnabled(true);
        wv.setVerticalScrollBarEnabled(true);
        wv.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
        wv.loadUrl("file:///android_asset/Coming Soon/favicon.html");


    }
}
