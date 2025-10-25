{
  description = "A flake for python development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      python-with-packages = pkgs.python3.withPackages (ps: [
      ]);
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [
          python-with-packages
          pkgs.typescript-language-server
          pkgs.prettier
          pkgs.vscode-langservers-extracted
        ];
      };
    };
}
